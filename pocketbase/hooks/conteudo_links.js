// T3.21 — SPEC-3-021 Leva A: links rastreáveis (cap. 7.1) + D17/D18.
// POST /backend/v1/conteudos/{id}/links — gera 1 link por canal_destino:
//   {destino}?utm_source={canal}&utm_medium={organico|pago}&utm_campaign={identificador}
// Destino = destino_link do conteúdo (default: página do formulário de entrada — D18).
// utm_campaign = identificador da campanha (slug D17) ou slug do conteúdo.
// Link já gerado e utilizado NÃO pode ser alterado (imutável — cap. 7.1);
// regeneração só ADICIONA canal novo. Social media não constrói link manualmente.
// Runtime goja: helpers inline (AP-0200).
routerAdd(
  'POST',
  '/backend/v1/conteudos/{id}/links',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel === 'social_media')
      return e.json(403, { error: 'Social media copia os links gerados — não os gera.' })
    var r
    try {
      r = $app.findRecordById('conteudos', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Conteúdo não encontrado.' })
    }
    var canais = r.get('canais_destino') || []
    if (canais.length === 0) return e.json(400, { error: 'Conteúdo sem canal de destino.' })
    // destino (D18): destino_link do conteúdo ou /entrada
    var destino = String(r.get('destino_link') || '').trim()
    if (!destino) destino = 'https://tela-de-login-crm-a400a--preview.goskip.app/entrada'
    // utm_campaign: identificador da campanha (D17) ou slug do conteúdo
    var campanhaSlug = ''
    var cid = String(r.get('campanha') || '')
    if (cid) {
      try {
        campanhaSlug = String($app.findRecordById('campanhas', cid).get('identificador') || '')
      } catch (_) {}
    }
    if (!campanhaSlug) {
      var ano = new Date().getFullYear()
      var linha = String(r.get('linha_solucao') || 'conteudo')
      var tema = String(r.get('titulo_interno') || r.get('tema') || 'conteudo')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
      campanhaSlug = ano + '-' + linha + '-' + (tema || 'conteudo')
    }
    var meio = 'organico'
    if (cid) {
      try {
        var tipoCamp = String($app.findRecordById('campanhas', cid).get('tipo') || 'organica')
        if (tipoCamp === 'paga') meio = 'pago'
      } catch (_) {}
    }
    var links = {}
    try {
      links = JSON.parse(String(r.get('links_rastreaveis') || '{}'))
    } catch (_) {
      links = {}
    }
    var gerados = []
    var imutaveis = []
    for (var i = 0; i < canais.length; i++) {
      var canal = String(canais[i])
      if (links[canal]) {
        // imutável após o primeiro uso (cap. 7.1)
        imutaveis.push(canal)
        continue
      }
      var sep = destino.indexOf('?') >= 0 ? '&' : '?'
      var link =
        destino +
        sep +
        'utm_source=' +
        canal +
        '&utm_medium=' +
        meio +
        '&utm_campaign=' +
        campanhaSlug
      links[canal] = link
      gerados.push(canal)
    }
    if (gerados.length === 0) {
      return e.json(400, {
        error:
          'Todos os canais já têm link gerado — link já utilizado não pode ser alterado (atribuição preservada).',
        links: links,
      })
    }
    r.set('links_rastreaveis', JSON.stringify(links))
    try {
      $app.save(r)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar links: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'conteudos')
      a.set('registro_id', r.id)
      a.set('acao', 'update')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set(
        'estado_posterior',
        JSON.stringify({
          links_gerados: gerados,
          imutaveis_preservados: imutaveis,
          utm_campaign: campanhaSlug,
        }),
      )
      $app.save(a)
    } catch (_) {}
    return e.json(200, {
      ok: true,
      links: links,
      gerados: gerados,
      preservados: imutaveis,
      utm_campaign: campanhaSlug,
    })
  },
  $apis.requireAuth(),
)

// PATCH /backend/v1/conteudos/{id}/url — social media registra o endereço da
// publicação por canal (cap. 6.2: campo de retorno na mesma tela).
routerAdd(
  'PATCH',
  '/backend/v1/conteudos/{id}/url',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var r
    try {
      r = $app.findRecordById('conteudos', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Conteúdo não encontrado.' })
    }
    var body = e.requestInfo().body || {}
    var canal = String(body.canal || '').trim()
    var url = String(body.url || '').trim()
    var CANAIS = ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site']
    if (CANAIS.indexOf(canal) < 0) return e.json(400, { error: 'Canal inválido.' })
    if (!url) return e.json(400, { error: 'Informe o endereço da publicação.' })
    if (url.indexOf('http') !== 0)
      return e.json(400, { error: 'Endereço inválido — comece com http(s)://.' })
    var urls = {}
    try {
      urls = JSON.parse(String(r.get('url_publicacao') || '{}'))
    } catch (_) {
      urls = {}
    }
    urls[canal] = url
    r.set('url_publicacao', JSON.stringify(urls))
    try {
      $app.save(r)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar url: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'conteudos')
      a.set('registro_id', r.id)
      a.set('acao', 'update')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set('estado_posterior', JSON.stringify({ url_publicacao: canal }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, url_publicacao: urls })
  },
  $apis.requireAuth(),
)
