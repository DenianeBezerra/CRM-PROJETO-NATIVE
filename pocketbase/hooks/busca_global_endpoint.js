// M-19 ampliado (CEO 13/09) — Busca global com 4 tipos de resultado, em
// seções separadas: Empresas, Contatos, Oportunidades, Conteúdos.
// Conteúdos: busca em título, tema e roteiro (o que a Visão 3 da Leva B exige).
// Permissões: social_media não alcança dados comerciais (mesma regra do módulo);
// conteúdos ela pode ler (prestadora lê o módulo de conteúdo).
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
    if (q.length < 2) {
      return e.json(200, { total: 0, empresas: [], clientes: [], oportunidades: [], conteudos: [] })
    }
    var like = '%' + q.replace(/[%"]/g, '') + '%'

    // ---- Empresas ----
    var empresas = []
    try {
      var es = $app.findRecordsByFilter('empresas', 'nome ~ {:q} || cnpj ~ {:q}', 'nome', 8, 0, {
        q: like,
      })
      for (var i = 0; i < es.length; i++) {
        empresas.push({
          id: es[i].id,
          nome: String(es[i].get('nome') || ''),
          setor: String(es[i].get('setor') || ''),
          status: String(es[i].get('status') || ''),
        })
      }
    } catch (errE) {
      return e.json(500, { error: 'Falha na busca de empresas: ' + String(errE) })
    }

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
      for (var j = 0; j < cs.length; j++) {
        var empresaNome = ''
        try {
          empresaNome = String(
            $app.findRecordById('empresas', String(cs[j].get('empresa') || '')).get('nome') || '',
          )
        } catch (_) {}
        clientes.push({
          id: cs[j].id,
          nome: String(cs[j].get('nome') || ''),
          email: String(cs[j].get('email') || ''),
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
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k]
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

    // ---- Conteúdos (título, tema e roteiro — base da Visão 3) ----
    var conteudos = []
    try {
      var cos = $app.findRecordsByFilter(
        'conteudos',
        'titulo_interno ~ {:q} || tema ~ {:q} || roteiro ~ {:q}',
        '-created',
        8,
        0,
        { q: like },
      )
      for (var m = 0; m < cos.length; m++) {
        var c = cos[m]
        var etapaLabel = String(c.get('status') || '')
        conteudos.push({
          id: c.id,
          titulo: String(c.get('titulo_interno') || ''),
          tema: String(c.get('tema') || ''),
          formato: String(c.get('formato') || ''),
          status: etapaLabel,
          canais: c.get('canais_destino') || [],
        })
      }
    } catch (errCo) {
      return e.json(500, { error: 'Falha na busca de conteúdos: ' + String(errCo) })
    }

    return e.json(200, {
      total: empresas.length + clientes.length + oportunidades.length + conteudos.length,
      empresas: empresas,
      clientes: clientes,
      oportunidades: oportunidades,
      conteudos: conteudos,
    })
  },
  $apis.requireAuth(),
)
