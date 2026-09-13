// T3.21 Leva B — SPEC-3-021B Visão 2: Calendário mensal + painel do dia.
// GET /backend/v1/agenda-conteudos?mes=YYYY-MM
// Segmento literal PRÓPRIO (lição T3.11: evitar conflito com /conteudos/{id}).
// Lê a MESMA base (conteudos) — sem duplicação de dados (princípio da SPEC).
// social_media lê (prestadora acompanha a agenda); ninguém cria/edita aqui.
// Runtime goja: helpers inline no callback (AP-0200).
routerAdd(
  'GET',
  '/backend/v1/agenda-conteudos',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var q = e.request.url.query().get('mes') || ''
    var hoje = new Date()
    var mes = String(q).trim()
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      var aa = hoje.getFullYear()
      var mm = hoje.getMonth() + 1
      mes = aa + '-' + (mm < 10 ? '0' + mm : mm)
    }
    var ano = parseInt(mes.slice(0, 4), 10)
    var m = parseInt(mes.slice(5, 7), 10)
    if (m < 1 || m > 12) return e.json(400, { error: 'Mês inválido — use o formato YYYY-MM.' })
    var ini = ano + '-' + (m < 10 ? '0' + m : m) + '-01 00:00:00.000Z'
    var anoFim = m === 12 ? ano + 1 : ano
    var mesFim = m === 12 ? 1 : m + 1
    var fim = anoFim + '-' + (mesFim < 10 ? '0' + mesFim : mesFim) + '-01 00:00:00.000Z'
    var recs = []
    try {
      recs = $app.findRecordsByFilter(
        'conteudos',
        "data_prevista >= {:ini} && data_prevista < {:fim} && status != 'arquivado'",
        'data_prevista',
        500,
        0,
        { ini: ini, fim: fim },
      )
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar a agenda: ' + String(err) })
    }
    var agora = Date.now()
    var dias = {}
    var total = 0
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      var dp = String(r.get('data_prevista') || '')
      if (!dp || dp.indexOf('0001-01-01') === 0) continue
      var dia = dp.slice(0, 10)
      var st = String(r.get('status') || '')
      var atrasado = false
      if (st !== 'publicado' && st !== 'arquivado') {
        var fimDia = Date.parse(dia + 'T23:59:59Z')
        if (!isNaN(fimDia) && fimDia < agora) atrasado = true
      }
      var serieNome = ''
      try {
        var sid = String(r.get('serie') || '')
        if (sid) serieNome = String($app.findRecordById('series', sid).get('nome') || '')
      } catch (_) {}
      var campNome = ''
      var campSlug = ''
      try {
        var cid = String(r.get('campanha') || '')
        if (cid) {
          var cr = $app.findRecordById('campanhas', cid)
          campNome = String(cr.get('nome') || '')
          campSlug = String(cr.get('identificador') || '')
        }
      } catch (_) {}
      var respNome = ''
      try {
        var rp = String(r.get('responsavel_producao') || '')
        if (rp) respNome = String($app.findRecordById('_pb_users_auth_', rp).get('name') || '')
      } catch (_) {}
      var links = {}
      try {
        links = JSON.parse(String(r.get('links_rastreaveis') || '{}'))
        if (!links || typeof links !== 'object') links = {}
      } catch (_) {
        links = {}
      }
      var urls = {}
      try {
        urls = JSON.parse(String(r.get('url_publicacao') || '{}'))
        if (!urls || typeof urls !== 'object') urls = {}
      } catch (_) {
        urls = {}
      }
      var canais = r.get('canais_destino') || []
      var linksOk = 0
      for (var c2 = 0; c2 < canais.length; c2++) {
        if (links[String(canais[c2])]) linksOk++
      }
      var pacoteOk =
        String(r.get('capa') || '') !== '' &&
        String(r.get('arquivo_final') || '') !== '' &&
        String(r.get('legenda') || '').trim() !== '' &&
        String(r.get('data_prevista') || '') !== '' &&
        linksOk >= canais.length
      if (!dias[dia]) dias[dia] = { planejadas: 0, publicadas: 0, atrasadas: 0, itens: [] }
      if (st === 'publicado') dias[dia].publicadas++
      else {
        dias[dia].planejadas++
        if (atrasado) dias[dia].atrasadas++
      }
      total++
      dias[dia].itens.push({
        id: r.id,
        titulo_interno: String(r.get('titulo_interno') || ''),
        tema: String(r.get('tema') || ''),
        formato: String(r.get('formato') || ''),
        canais_destino: canais,
        status: st,
        data_prevista: dp,
        data_efetiva: String(r.get('data_efetiva') || ''),
        atrasado: atrasado,
        serie: serieNome,
        campanha: campNome,
        campanha_slug: campSlug,
        responsavel_producao_nome: respNome,
        links_rastreaveis: links,
        url_publicacao: urls,
        pacote_completo: pacoteOk,
      })
    }
    return e.json(200, { mes: mes, total: total, dias: dias })
  },
  $apis.requireAuth(),
)
