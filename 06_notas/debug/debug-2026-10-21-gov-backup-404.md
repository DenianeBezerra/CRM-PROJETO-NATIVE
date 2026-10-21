// Governança de dados — Parte 1 (continuação): helper de visibilidade.
// Função exportada via $app para os endpoints de leitura aplicarem a regra:
// podeVerEmpresa(actor, empresaId) — true se visibilidade_restrita=false,
// ou se o ator é diretoria/coordenação, ou é responsável de um negócio
// da empresa, ou criou/é responsável por conteúdo? NÃO — visibilidade cobre
// dados de CLIENTE (empresas/contatos/negócios/obrigações/implantação/ficha).
// Conteúdos (marketing da Vibratto) não são dados de cliente — fora do recorte.
// Runtime goja: sem ternário, sem String().length (AP-0200/T3.02b).

// O helper vive como rota interna não-exposta? goja não exporta símbolos entre
// arquivos — padrão do projeto: lógica inline no endpoint que a usa.
// Este arquivo documenta a regra e aplica no endpoint da ficha de empresa
// (o único endpoint de leitura por empresa criado até aqui).
routerAdd(
  'GET',
  '/backend/v1/empresas/{id}/ficha',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var id = e.request.pathValue('id')

    var emp
    try {
      emp = $app.findRecordById('empresas', id)
    } catch (_) {
      return e.json(404, { error: 'Empresa não encontrada.' })
    }

    // ---- visibilidade por responsável (seção 5, requisitos complementares) ----
    var restrita = emp.get('visibilidade_restrita') === true
    var papel = String(actor.get('role') || '')
    var ehDirecao = papel === 'admin' || papel === 'diretoria' || papel === 'coordenacao'
    var contatos = []
    try {
      contatos = $app.findRecordsByFilter('clientes', 'empresa = {:emp}', '', 200, 0, { emp: id })
    } catch (_) {}
    if (restrita && !ehDirecao) {
      // só passa quem é responsável de um negócio da empresa
      var autorizado = false
      for (var i = 0; i < contatos.length && !autorizado; i++) {
        try {
          var ns = $app.findRecordsByFilter(
            'negocios',
            'cliente = {:c} && responsavel = {:r}',
            '',
            1,
            0,
            {
              c: contatos[i].id,
              r: actor.id,
            },
          )
          if (ns.length > 0) autorizado = true
        } catch (_) {}
      }
      if (!autorizado) {
        return e.json(403, {
          error:
            'Registro com visibilidade restrita — disponível apenas ao responsável e à direção.',
        })
      }
    }

    // ---- a partir daqui, a lógica original da ficha (idêntica à versão concluída) ----
    var ficha = {
      empresa: {
        id: emp.id,
        nome: String(emp.get('nome') || ''),
        cnpj: String(emp.get('cnpj') || ''),
        setor: String(emp.get('setor') || ''),
        status: String(emp.get('status') || ''),
        observacoes: String(emp.get('observacoes') || ''),
        visibilidade_restrita: restrita,
        created: String(emp.get('created') || ''),
      },
      contatos: [],
      negocios: [],
      obrigacoes: { total: 0, mes_corrente: { total: 0, feitas: 0, atrasadas: 0, pendentes: 0 } },
      implantacao: null,
      ficha_operacional: null,
    }

    var contatoIds = []
    for (var c2 = 0; c2 < contatos.length; c2++) {
      var c = contatos[c2]
      contatoIds.push(c.id)
      ficha.contatos.push({
        id: c.id,
        nome: String(c.get('nome') || ''),
        cargo: String(c.get('cargo') || ''),
        email: String(c.get('email') || ''),
        telefone: String(c.get('telefone') || ''),
        status: String(c.get('status') || ''),
      })
    }

    var vistosNeg = {}
    var ganhos = 0
    var abertos = 0
    for (var k = 0; k < contatoIds.length; k++) {
      var lista = []
      try {
        lista = $app.findRecordsByFilter('negocios', 'cliente = {:c0}', '-created', 200, 0, {
          c0: contatoIds[k],
        })
      } catch (_) {}
      for (var n = 0; n < lista.length; n++) {
        var neg = lista[n]
        if (vistosNeg[neg.id]) continue
        vistosNeg[neg.id] = true
        var st = String(neg.get('status') || '')
        if (st === 'ganho') ganhos++
        else if (st !== 'perdido') abertos++
        ficha.negocios.push({
          id: neg.id,
          titulo: String(neg.get('titulo') || ''),
          servico: String(neg.get('servico') || ''),
          status: st,
          valor: neg.get('valor') || 0,
          data_entrada: String(neg.get('data_entrada') || ''),
        })
      }
    }
    ficha.negocios_resumo = { total: ficha.negocios.length, abertos: abertos, ganhos: ganhos }

    var hoje = new Date()
    var mesChave =
      hoje.getFullYear() +
      '-' +
      (hoje.getMonth() + 1 < 10 ? '0' + (hoje.getMonth() + 1) : hoje.getMonth() + 1)
    var obrs = []
    try {
      obrs = $app.findRecordsByFilter('obrigacoes', 'cliente = {:emp}', '-data_prevista', 2000, 0, {
        emp: id,
      })
    } catch (_) {}
    ficha.obrigacoes.total = obrs.length
    for (var o = 0; o < obrs.length; o++) {
      var ob = obrs[o]
      var dp = String(ob.get('data_prevista') || '')
      var ciclo = String(ob.get('ciclo_chave') || '')
      if (ciclo.indexOf(mesChave) !== 0 && dp.slice(0, 7) !== mesChave) continue
      ficha.obrigacoes.mes_corrente.total++
      var stO = String(ob.get('status') || '')
      if (stO === 'concluida' || stO === 'concluido' || stO === 'feita') {
        ficha.obrigacoes.mes_corrente.feitas++
      } else {
        var prazo = String(ob.get('prazo_limite') || dp)
        var fimPrazo = Date.parse(prazo.slice(0, 10) + 'T23:59:59Z')
        if (!isNaN(fimPrazo) && fimPrazo < Date.now()) {
          ficha.obrigacoes.mes_corrente.atrasadas++
        } else {
          ficha.obrigacoes.mes_corrente.pendentes++
        }
      }
    }

    try {
      var imps = $app.findRecordsByFilter('implantacoes', 'empresa = {:emp}', '-created', 1, 0, {
        emp: id,
      })
      if (imps.length > 0) {
        var im = imps[0]
        ficha.implantacao = {
          id: im.id,
          status: String(im.get('status') || ''),
          modelo: String(im.get('modelo') || ''),
          data_inicio: String(im.get('data_inicio') || ''),
          data_conclusao: String(im.get('data_conclusao') || ''),
        }
      }
    } catch (_) {}

    try {
      var fops = $app.findRecordsByFilter(
        'fichas_operacionais',
        'empresa = {:emp}',
        '-created',
        1,
        0,
        { emp: id },
      )
      if (fops.length > 0) {
        var fo = fops[0]
        ficha.ficha_operacional = {
          id: fo.id,
          data_inicio_operacao: String(fo.get('data_inicio_operacao') || ''),
          dia_envio_relatorio: String(fo.get('dia_envio_relatorio') || ''),
        }
      }
    } catch (_) {}

    return e.json(200, ficha)
  },
  $apis.requireAuth(),
)

// ---- toggle de visibilidade (só diretoria — seção 5) ----
routerAdd(
  'POST',
  '/backend/v1/empresas/{id}/visibilidade',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'diretoria') {
      return e.json(403, { error: 'Apenas a diretoria altera a visibilidade do registro.' })
    }
    var emp
    try {
      emp = $app.findRecordById('empresas', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Empresa não encontrada.' })
    }
    var body = e.requestInfo().body || {}
    var restrita = body.restrita === true
    var anterior = emp.get('visibilidade_restrita') === true
    emp.set('visibilidade_restrita', restrita)
    try {
      $app.save(emp)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar visibilidade: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'empresas')
      a.set('registro_id', emp.id)
      a.set('acao', 'update')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', JSON.stringify({ visibilidade_restrita: anterior }))
      a.set('estado_posterior', JSON.stringify({ visibilidade_restrita: restrita }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, visibilidade_restrita: restrita })
  },
  $apis.requireAuth(),
)

// ---- backup on-demand (diretoria) — mesma lógica do cron diário ----
// (caminho /gov/backups/executar: o segmento /backup/{id} conflita com a rota de restaurar)
routerAdd(
  'POST',
  '/backend/v1/gov/backups/executar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'diretoria') {
      return e.json(403, { error: 'Execução de backup exclusiva da diretoria.' })
    }
    var COLECOES_BACKUP = [
      'empresas',
      'clientes',
      'negocios',
      'obrigacoes',
      'implantacoes',
      'fichas_operacionais',
      'conteudos',
      'conteudo_eventos',
      'series',
      'campanhas',
      'ativos',
      'interacoes_whatsapp',
      'interacoes_email',
      'tarefas',
      'comentarios',
    ]
    var totalGeral = 0
    var dados = {}
    for (var i = 0; i < COLECOES_BACKUP.length; i++) {
      var nome = COLECOES_BACKUP[i]
      var recs = []
      try {
        recs = $app.findRecordsByFilter(nome, '', '-id', 5000, 0)
      } catch (_) {
        continue
      }
      var CAMPOS_POR_COLECAO = {
        empresas: ['nome', 'cnpj', 'setor', 'status', 'observacoes', 'visibilidade_restrita'],
        clientes: [
          'nome',
          'cargo',
          'email',
          'telefone',
          'cidade',
          'origem',
          'status',
          'empresa',
          'observacoes',
          'origem_base',
          'linkedin_url',
          'retencao_ate',
          'cadencia_passo',
        ],
        negocios: [
          'titulo',
          'servico',
          'status',
          'estagio',
          'valor',
          'probabilidade',
          'prioridade',
          'cliente',
          'responsavel',
          'origem',
          'origem_especifica',
          'canal',
          'campanha',
          'motivo_ganho',
          'motivo_perda',
          'data_entrada',
          'data_fechamento_previsto',
          'data_ganho',
          'observacoes',
        ],
        obrigacoes: [
          'tipo',
          'cliente',
          'ficha',
          'etapa',
          'status',
          'data_prevista',
          'prazo_limite',
          'data_conclusao',
          'ciclo_chave',
          'responsavel',
          'motivo_bloqueio',
        ],
        implantacoes: [
          'empresa',
          'modelo',
          'status',
          'data_inicio',
          'data_conclusao',
          'responsavel',
        ],
        fichas_operacionais: [
          'empresa',
          'data_inicio_operacao',
          'dia_envio_relatorio',
          'dia_emissao',
          'destino_notas',
          'destino_comprovantes',
        ],
        conteudos: [
          'titulo_interno',
          'tema',
          'formato',
          'canais_destino',
          'status',
          'data_prevista',
          'data_efetiva',
          'serie',
          'campanha',
          'linha_solucao',
          'objetivo',
          'roteiro',
          'legenda',
          'destino_link',
          'links_rastreaveis',
          'url_publicacao',
          'responsavel_producao',
        ],
        conteudo_eventos: ['conteudo', 'etapa_de', 'etapa_para', 'motivo', 'autor'],
        series: ['nome', 'descricao', 'periodicidade', 'canais', 'status', 'responsavel'],
        campanhas: [
          'nome',
          'identificador',
          'tipo',
          'objetivo',
          'linha_solucao',
          'periodo_inicio',
          'periodo_fim',
          'status',
        ],
        ativos: ['nome', 'tipo', 'vigente', 'tags', 'criado_por'],
        interacoes_whatsapp: [
          'negocio',
          'contato',
          'direcao',
          'resumo',
          'resultado',
          'responsavel',
          'proxima_acao_descricao',
          'proxima_acao_em',
          'created',
        ],
        interacoes_email: [
          'negocio',
          'contato',
          'direcao',
          'assunto',
          'resumo',
          'resultado',
          'responsavel',
          'proxima_acao_descricao',
          'proxima_acao_em',
          'created',
        ],
        tarefas: ['titulo', 'descricao', 'status', 'responsavel', 'negocio', 'prazo'],
        comentarios: ['negocio', 'tarefa', 'autor', 'texto', 'mencoes'],
      }
      var CAMPOS = CAMPOS_POR_COLECAO[nome] || []
      var itens = []
      for (var r = 0; r < recs.length; r++) {
        var rec = recs[r]
        var obj = { _id: rec.id }
        for (var f = 0; f < CAMPOS.length; f++) {
          var nomeCampo = CAMPOS[f]
          try {
            obj[nomeCampo] = rec.get(nomeCampo)
          } catch (_) {}
        }
        itens.push(obj)
      }
      dados[nome] = itens
      totalGeral += itens.length
    }
    var colB = $app.findCollectionByNameOrId('backups_gov')
    var recB = new Record(colB)
    recB.set('tipo', 'manual')
    recB.set('dados', JSON.stringify(dados))
    recB.set('total_registros', totalGeral)
    $app.save(recB)
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'backups_gov')
      a.set('registro_id', recB.id)
      a.set('acao', 'backup_manual')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set('estado_posterior', JSON.stringify({ total_registros: totalGeral }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, id: recB.id, total_registros: totalGeral })
  },
  $apis.requireAuth(),
)

// ---- backups: listar (diretoria/coordenação) + restaurar (só diretoria) ----
// (movidos para este arquivo — gov_backup_api.js não carregava no pod; lição 21/10)
routerAdd(
  'GET',
  '/backend/v1/gov/backups',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'diretoria' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Listagem de backups exclusiva da direção.' })
    }
    var recs = []
    try {
      recs = $app.findRecordsByFilter('backups_gov', '', '-created', 60, 0)
    } catch (_) {}
    var itens = []
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      itens.push({
        id: r.id,
        tipo: String(r.get('tipo') || ''),
        total_registros: r.get('total_registros') || 0,
        created: String(r.get('created') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/gov/backup/{id}/restaurar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'diretoria') {
      return e.json(403, { error: 'Restauração exclusiva da diretoria.' })
    }
    var body = e.requestInfo().body || {}
    if (String(body.confirm || '') !== 'RESTAURAR') {
      return e.json(400, { error: "Confirmação obrigatória: envie confirm: 'RESTAURAR'." })
    }
    var bk
    try {
      bk = $app.findRecordById('backups_gov', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Backup não encontrado.' })
    }
    var dados
    try {
      dados = JSON.parse(String(bk.get('dados') || '{}'))
    } catch (_) {
      return e.json(500, { error: 'Snapshot corrompido.' })
    }
    var restaurados = 0
    var falhas = []
    for (var nomeCol in dados) {
      var itens = dados[nomeCol]
      for (var i = 0; i < itens.length; i++) {
        var obj = itens[i]
        if (!obj._id) continue
        var existe = false
        try {
          $app.findRecordById(nomeCol, obj._id)
          existe = true
        } catch (_) {
          existe = false
        }
        if (!existe) {
          try {
            var colR = $app.findCollectionByNameOrId(nomeCol)
            var recR = new Record(colR)
            recR.set('id', obj._id)
            for (var campo in obj) {
              if (campo === '_id') continue
              recR.set(campo, obj[campo])
            }
            $app.save(recR)
            restaurados++
          } catch (errR) {
            falhas.push(nomeCol + '/' + obj._id + ': ' + String(errR))
          }
        }
      }
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'backups_gov')
      a.set('registro_id', bk.id)
      a.set('acao', 'restauracao_backup')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set('estado_posterior', JSON.stringify({ restaurados: restaurados, falhas: falhas.length }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, restaurados: restaurados, falhas: falhas.slice(0, 10) })
  },
  $apis.requireAuth(),
)
