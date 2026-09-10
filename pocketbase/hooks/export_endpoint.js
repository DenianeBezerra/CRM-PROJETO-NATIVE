// T2.04/CA-2-039: exportação de dados pessoais via endpoint server-side autorizado.
// O servidor recalcula filtros e quantidade, exige aceite válido do próprio usuário
// e registra trilha append-only. Acesso direto não contorna: sem aceite válido,
// nenhum arquivo de dados pessoais é gerado.
//
// Padrões JSVM (lições T2.01/T9.1/T2.04): sem funções top-level referenciadas por
// callbacks, finders que lançam exceção em "no rows" sempre dentro de try/catch,
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
    let q = ''
    let status = 'todos'
    let stage = 'todos'
    try {
      q = String(e.request.url.query().get('q') || '').trim()
      status = String(e.request.url.query().get('status') || 'todos')
      stage = String(e.request.url.query().get('stage') || 'todos')
    } catch (err) {
      $app.logger().error('Falha ao ler query params', 'error', String(err))
      return e.json(400, { error: 'Parâmetros inválidos.' })
    }

    const safeParts = []
    if (q !== '') {
      const escaped = q.split('"').join("'")
      if (entidade === 'clientes') {
        safeParts.push(
          '(nome ~ "' + escaped + '" || email ~ "' + escaped + '" || telefone ~ "' + escaped + '")',
        )
      } else {
        safeParts.push('titulo ~ "' + escaped + '"')
      }
    }
    if (
      entidade === 'clientes' &&
      (status === 'ativo' || status === 'inativo' || status === 'prospect')
    ) {
      safeParts.push('status = "' + status + '"')
    }
    if (entidade === 'negocios' && stage !== 'todos') {
      safeParts.push('estagio = "' + stage + '"')
    }
    const filter = safeParts.join(' && ')

    // ---- 2. Quantidade é recalculada pelo SERVIDOR, nunca confiada ao cliente.
    let records = []
    try {
      records = $app.findRecordsByFilter(entidade, filter, '-created', 10000, 0)
    } catch (err) {
      $app.logger().error('Falha ao consultar registros para exportação', 'error', String(err))
      return e.json(400, { error: 'Filtros inválidos para a consulta.' })
    }
    const quantidade = records.length

    // ---- 3. Aceite válido: mesmo usuário, mesma entidade, não consumido.
    const aceiteId = String(e.request.url.query().get('aceite') || '')
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
    let ultimoConsumo = null
    try {
      ultimoConsumo = $app.findFirstRecordByFilter(
        'exportacoes',
        'usuario = {:u} && csv_gerado = true',
        { u: actor.id },
      )
    } catch {
      ultimoConsumo = null
    }
    if (ultimoConsumo) {
      const criadoAceite = String(aceite.get('created'))
      const consumidoEm = String(ultimoConsumo.get('ocorrido_em'))
      if (criadoAceite <= consumidoEm) {
        return e.json(403, { error: 'Aceite já consumido. Confirme a exportação novamente.' })
      }
    }

    // ---- 4. Campos permitidos por entidade (contrato SPEC-1-012) + neutralização
    // CSV injection (padrão OWASP, mesma regra da T2.03) — tudo inline, sem helpers.
    let headers = []
    if (entidade === 'clientes') {
      headers = ['Nome', 'Empresa', 'E-mail', 'Telefone', 'Cidade', 'Origem', 'Status']
    } else {
      headers = [
        'Título',
        'Contato',
        'Valor',
        'Estágio',
        'Probabilidade',
        'Fechamento previsto',
        'Motivo da perda',
        'Detalhe da perda',
      ]
    }

    const rows = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const linha = []
      if (entidade === 'clientes') {
        let empresaNome = ''
        const empresaRef = r.get('empresa')
        if (empresaRef) {
          try {
            empresaNome = String($app.findRecordById('empresas', empresaRef).get('nome'))
          } catch {
            empresaNome = ''
          }
        }
        linha.push(
          r.get('nome'),
          empresaNome,
          r.get('email'),
          r.get('telefone'),
          r.get('cidade'),
          r.get('origem'),
          r.get('status'),
        )
      } else {
        let contatoNome = ''
        const contatoRef = r.get('cliente')
        if (contatoRef) {
          try {
            contatoNome = String($app.findRecordById('clientes', contatoRef).get('nome'))
          } catch {
            contatoNome = ''
          }
        }
        linha.push(
          r.get('titulo'),
          contatoNome,
          r.get('valor'),
          r.get('estagio'),
          r.get('probabilidade'),
          r.get('data_fechamento_previsto'),
          r.get('motivo_perda'),
          r.get('motivo_perda_detalhe'),
        )
      }
      rows.push(linha)
    }

    const cell = function (value) {
      let text = value === null || value === undefined ? '' : String(value)
      if (text.length > 0) {
        const primeiro = text.charAt(0)
        if (primeiro === '=' || primeiro === '+' || primeiro === '-' || primeiro === '@') {
          text = "'" + text
        }
      }
      return '"' + text.split('"').join('""') + '"'
    }

    let csv = '\ufeff' + headers.map(cell).join(';')
    for (let i = 0; i < rows.length; i++) {
      csv = csv + '\r\n' + rows[i].map(cell).join(';')
    }

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
      const agora = new Date()
      const iso = agora.toISOString()
      evento.set('ocorrido_em', iso.substring(0, iso.length - 1))
      $app.save(evento)
    } catch (err) {
      $app.logger().error('Falha ao registrar trilha de exportação', 'error', String(err))
      return e.json(500, { error: 'Falha ao registrar a exportação. Arquivo não gerado.' })
    }

    // ---- 6. Entrega do arquivo.
    const hoje = new Date().toISOString().slice(0, 10)
    const nomeArquivo = entidade + '-' + hoje + '.csv'
    return e.json(200, {
      filename: nomeArquivo,
      quantidade: quantidade,
      csv: csv,
    })
  },
  $apis.requireAuth(),
)
