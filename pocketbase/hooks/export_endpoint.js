// T2.04/CA-2-039: exportação de dados pessoais via endpoint server-side autorizado.
// O servidor recalcula filtros e quantidade, exige aceite válido do próprio usuário
// e registra trilha append-only. Acesso direto não contorna: sem aceite válido,
// nenhum arquivo de dados pessoais é gerado.
//
// Padrões JSVM (lições T2.01/T9.1): sem funções top-level referenciadas por callbacks,
// datas sem "Z" duplicado, e.next() nunca dentro de runInTransaction em request hooks.

routerAdd(
  'GET',
  '/backend/v1/export/{entidade}',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária para exportar dados.' })
    }

    const entidade = e.request.pathValue('entidade')
    if (entidade !== 'clientes' && entidade !== 'negocios') {
      return e.json(400, { error: 'Entidade inválida.' })
    }

    // ---- 1. Filtros vindos do cliente são saneados; a consulta é reconstruída aqui.
    const q = String(e.request.url().query().get('q') || '').trim()
    const status = String(e.request.url().query().get('status') || 'todos')
    const stage = String(e.request.url().query().get('stage') || 'todos')

    let filter = ''
    const safeParts = []
    if (q !== '') {
      const escaped = q.replaceAll('"', "'")
      if (entidade === 'clientes') {
        safeParts.push(`(nome ~ "${escaped}" || email ~ "${escaped}" || telefone ~ "${escaped}")`)
      } else {
        safeParts.push(`titulo ~ "${escaped}"`)
      }
    }
    if (entidade === 'clientes' && ['ativo', 'inativo', 'prospect'].includes(status)) {
      safeParts.push(`status = "${status}"`)
    }
    if (entidade === 'negocios' && stage !== 'todos') {
      safeParts.push(`estagio = "${stage}"`)
    }
    filter = safeParts.join(' && ')

    // ---- 2. Quantidade é recalculada pelo SERVIDOR, nunca confiada ao cliente.
    const records = $app.findRecordsByFilter(entidade, filter, 'created', 0, 10000)
    const quantidade = records.length

    // ---- 3. Aceite válido: mesmo usuário, mesma entidade, criado após o último
    // consumo deste usuário (cada aceite autoriza no máximo uma exportação).
    const aceiteId = String(e.request.url().query().get('aceite') || '')
    if (aceiteId === '') {
      return e.json(403, { error: 'Aceite de exportação obrigatório.' })
    }
    let aceite
    try {
      aceite = $app.findRecordById('aceites_exportacao', aceiteId)
    } catch {
      return e.json(403, { error: 'Aceite não encontrado.' })
    }
    if (aceite.get('usuario') !== actor.id) {
      return e.json(403, { error: 'Aceite pertence a outro usuário.' })
    }
    if (aceite.get('entidade') !== entidade) {
      return e.json(403, { error: 'Aceite é para outra entidade.' })
    }
    const ultimoConsumo = $app.findFirstRecordByFilter(
      'exportacoes',
      'usuario = {:u} && csv_gerado = true',
      { u: actor.id },
    )
    if (
      ultimoConsumo &&
      String(aceite.get('created')) <= String(ultimoConsumo.get('ocorrido_em'))
    ) {
      return e.json(403, { error: 'Aceite já consumido. Confirme a exportação novamente.' })
    }

    // ---- 4. Campos permitidos por entidade (nada além do contrato da SPEC-1-012).
    const headers =
      entidade === 'clientes'
        ? ['Nome', 'Empresa', 'E-mail', 'Telefone', 'Cidade', 'Origem', 'Status']
        : [
            'Título',
            'Contato',
            'Valor',
            'Estágio',
            'Probabilidade',
            'Fechamento previsto',
            'Motivo da perda',
            'Detalhe da perda',
          ]

    // Neutralização CSV injection (padrão OWASP) — mesma regra da T2.03.
    const cell = (value) => {
      let text = value == null ? '' : String(value)
      if (/^[=+\-@]/.test(text)) text = "'" + text
      return '"' + text.replaceAll('"', '""') + '"'
    }

    const rows = records.map((r) => {
      if (entidade === 'clientes') {
        let empresaNome = ''
        const empresaRef = r.get('empresa')
        if (empresaRef) {
          try {
            empresaNome = $app.findRecordById('empresas', empresaRef).get('nome')
          } catch {
            empresaNome = ''
          }
        }
        return [
          r.get('nome'),
          empresaNome,
          r.get('email'),
          r.get('telefone'),
          r.get('cidade'),
          r.get('origem'),
          r.get('status'),
        ]
      }
      let contatoNome = ''
      const contatoRef = r.get('cliente')
      if (contatoRef) {
        try {
          contatoNome = $app.findRecordById('clientes', contatoRef).get('nome')
        } catch {
          contatoNome = ''
        }
      }
      return [
        r.get('titulo'),
        contatoNome,
        r.get('valor'),
        r.get('estagio'),
        r.get('probabilidade'),
        r.get('data_fechamento_previsto'),
        r.get('motivo_perda'),
        r.get('motivo_perda_detalhe'),
      ]
    })

    const csv =
      '\ufeff' +
      [headers]
        .concat(rows)
        .map((row) => row.map(cell).join(';'))
        .join('\r\n')

    // ---- 5. Trilha append-only: quantidade é a RECALCULADA, aceite vinculado.
    try {
      const trilha = $app.findCollectionByNameOrId('exportacoes')
      const evento = new Record(trilha)
      evento.set('usuario', actor.id)
      evento.set('entidade', entidade)
      evento.set('filtros', JSON.stringify({ q: q, status: status, stage: stage }))
      evento.set('quantidade', quantidade)
      evento.set('aceite_id', aceiteId)
      evento.set('csv_gerado', true)
      evento.set('ocorrido_em', new Date().toISOString().replace('Z', ''))
      $app.save(evento)
    } catch (err) {
      // Falha de trilha não entrega o arquivo silenciosamente sem registro.
      $app.logger().error('Falha ao registrar trilha de exportação', 'error', String(err))
      return e.json(500, { error: 'Falha ao registrar a exportação. Arquivo não gerado.' })
    }

    // ---- 6. Entrega do arquivo.
    const nomeArquivo = entidade + '-' + new Date().toISOString().slice(0, 10) + '.csv'
    e.response.header().set('Content-Disposition', 'attachment; filename="' + nomeArquivo + '"')
    return e.json(200, {
      filename: nomeArquivo,
      quantidade: quantidade,
      csv: csv,
    })
  },
  'auth',
)
