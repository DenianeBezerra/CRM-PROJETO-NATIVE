// M-19 (CEO 13/09) — Busca global: um endpoint para cliente, contato e
// oportunidade, acessível de qualquer tela. Admin e operator usam; social_media
// não alcança dados comerciais (bloqueio por papel — mesma regra do módulo).
// Retorno mínimo por tipo: id, título/nome, subtítulo (empresa/valor/etapa),
// destino de navegação. Limite 8 por tipo (24 itens no dropdown).
routerAdd(
  'GET',
  '/backend/v1/busca-global',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel === 'social_media')
      return e.json(403, { error: 'Busca global não está disponível para social media.' })
    var q = String(e.request.url.query().get('q') || '').trim()
    if (q.length < 2) return e.json(200, { total: 0, clientes: [], oportunidades: [] })
    var like = '%' + q.replace(/[%"]/g, '') + '%'

    // ---- Contatos (clientes) ----
    var clientes = []
    try {
      var cs = $app.findRecordsByFilter(
        'clientes',
        '(nome ~ {:q} || email ~ {:q} || empresa ~ {:q})',
        'nome',
        8,
        0,
        { q: like },
      )
      for (var i = 0; i < cs.length; i++) {
        var empresaNome = ''
        try {
          empresaNome = String(
            $app.findRecordById('empresas', String(cs[i].get('empresa') || '')).get('nome') || '',
          )
        } catch (_) {}
        clientes.push({
          id: cs[i].id,
          nome: String(cs[i].get('nome') || ''),
          email: String(cs[i].get('email') || ''),
          empresa: empresaNome,
        })
      }
    } catch (errC) {
      return e.json(500, { error: 'Falha na busca de contatos: ' + String(errC) })
    }

    // ---- Oportunidades (negócios) ----
    var oportunidades = []
    try {
      var ns = $app.findRecordsByFilter(
        'negocios',
        'titulo ~ {:q} || campanha ~ {:q}',
        '-created',
        8,
        0,
        { q: like },
      )
      for (var j = 0; j < ns.length; j++) {
        var n = ns[j]
        var clienteNome = ''
        try {
          clienteNome = String(
            $app.findRecordById('clientes', String(n.get('cliente') || '')).get('nome') || '',
          )
        } catch (_) {}
        oportunidades.push({
          id: n.id,
          titulo: String(n.get('titulo') || ''),
          cliente: clienteNome,
          estagio: String(n.get('estagio') || ''),
          status: String(n.get('status') || ''),
          valor: n.get('valor') || 0,
        })
      }
    } catch (errN) {
      return e.json(500, { error: 'Falha na busca de oportunidades: ' + String(errN) })
    }

    return e.json(200, {
      total: clientes.length + oportunidades.length,
      clientes: clientes,
      oportunidades: oportunidades,
    })
  },
  $apis.requireAuth(),
)
