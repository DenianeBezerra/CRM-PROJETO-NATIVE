// T3.21 Leva B — criação de conteúdo pela UI (direcionamento da CEO 13/09).
// POST /backend/v1/conteudos/lote — criação em lote (agenda editorial):
// recebe {itens: [{titulo_interno, tema, formato, canais_destino, data_prevista,
// serie?, linha_solucao?, objetivo?, campanha?}]} e cria N peças de uma vez,
// cada uma na etapa 'ideia', com campanha D17 automática quando sem campanha.
// Validação mínima por item: título, tema (≤4 palavras), formato, canais, data.
// Tudo-ou-nada: se qualquer item falhar, nada é criado (resposta lista os erros).
// Social media não cria (mesma regra do POST individual). Runtime goja: inline.
routerAdd(
  'POST',
  '/backend/v1/conteudos/lote',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel === 'social_media')
      return e.json(403, {
        error: 'Social media não cria conteúdo — apenas publica e registra o retorno.',
      })
    var body = e.requestInfo().body || {}
    var itens = body.itens || []
    if (!itens.length || itens.length > 100)
      return e.json(400, { error: 'Envie entre 1 e 100 peças no campo itens.' })
    var FORMATOS = [
      'post_estatico',
      'carrossel',
      'reel',
      'video_longo',
      'artigo',
      'newsletter',
      'story',
      'live',
    ]
    var LINHAS = [
      'bpo_financeiro',
      'tesouraria',
      'controladoria',
      'cfo_as_a_service',
      'consultoria',
      'institucional',
    ]
    var OBJETIVOS = ['autoridade', 'geracao_lead', 'engajamento', 'venda_direta', 'institucional']
    var CANAIS = ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site']
    var LINHA_ABR = {
      bpo_financeiro: 'bpo',
      tesouraria: 'tesouraria',
      controladoria: 'controladoria',
      cfo_as_a_service: 'cfo',
      consultoria: 'consultoria',
      institucional: 'institucional',
    }
    // ---- validação prévia de TODOS os itens (tudo-ou-nada) ----
    var erros = []
    for (var i = 0; i < itens.length; i++) {
      var it = itens[i] || {}
      var titulo = String(it.titulo_interno || '').trim()
      var tema = String(it.tema || '').trim()
      var formato = String(it.formato || '').trim()
      var linha = String(it.linha_solucao || '').trim()
      var objetivo = String(it.objetivo || '').trim()
      var canais = it.canais_destino || []
      var dp = String(it.data_prevista || '').trim()
      var n = i + 1
      if (!titulo) erros.push('Item ' + n + ': informe o título interno.')
      if (!tema) erros.push('Item ' + n + ': informe o tema.')
      else {
        var palavras = tema.split(/\s+/).filter(Boolean)
        if (palavras.length > 4)
          erros.push(
            'Item ' +
              n +
              ': tema com ' +
              palavras.length +
              ' palavras — o limite é 4 (compõe o identificador D17).',
          )
      }
      if (FORMATOS.indexOf(formato) < 0) erros.push('Item ' + n + ': formato inválido.')
      if (LINHAS.indexOf(linha) < 0) erros.push('Item ' + n + ': linha de solução inválida.')
      if (OBJETIVOS.indexOf(objetivo) < 0) erros.push('Item ' + n + ': objetivo inválido.')
      if (!canais.length) erros.push('Item ' + n + ': selecione pelo menos um canal.')
      for (var ci = 0; ci < canais.length; ci++) {
        if (CANAIS.indexOf(String(canais[ci])) < 0)
          erros.push('Item ' + n + ': canal inválido (' + String(canais[ci]) + ').')
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dp))
        erros.push('Item ' + n + ': data prevista inválida — use AAAA-MM-DD.')
    }
    if (erros.length) return e.json(400, { error: erros.join(' '), erros: erros })
    // ---- criação (tudo-ou-nada via transação) ----
    var criados = []
    var falha = null
    $app.runInTransaction(function (txApp) {
      for (var k = 0; k < itens.length; k++) {
        if (falha) break
        var it2 = itens[k]
        var col = txApp.findCollectionByNameOrId('conteudos')
        var rec = new Record(col)
        rec.set('titulo_interno', String(it2.titulo_interno).trim())
        rec.set('formato', String(it2.formato).trim())
        rec.set('canais_destino', it2.canais_destino)
        rec.set('tema', String(it2.tema).trim())
        rec.set('linha_solucao', String(it2.linha_solucao).trim())
        rec.set('objetivo', String(it2.objetivo).trim())
        rec.set('status', 'ideia')
        if (String(it2.data_prevista || '').trim())
          rec.set('data_prevista', String(it2.data_prevista).trim())
        if (String(it2.serie || '').trim()) rec.set('serie', String(it2.serie).trim())
        if (String(it2.campanha || '').trim()) rec.set('campanha', String(it2.campanha).trim())
        // campanha D17 automática quando sem campanha (mesma regra do POST individual)
        if (!String(it2.campanha || '').trim()) {
          var anoC = new Date().getFullYear()
          var temaC = String(it2.tema || 'conteudo')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40)
          var slugC =
            anoC +
            '-' +
            (LINHA_ABR[String(it2.linha_solucao).trim()] || String(it2.linha_solucao).trim()) +
            '-' +
            (temaC || 'conteudo')
          var colCamp = txApp.findCollectionByNameOrId('campanhas')
          var campRec = new Record(colCamp)
          campRec.set('nome', String(it2.titulo_interno).trim())
          campRec.set('identificador', slugC)
          campRec.set('tipo', 'organica')
          campRec.set('objetivo', String(it2.objetivo).trim())
          campRec.set('linha_solucao', String(it2.linha_solucao).trim())
          campRec.set('status', 'planejada')
          try {
            txApp.save(campRec)
            rec.set('campanha', campRec.id)
          } catch (errCamp) {
            falha =
              'Peça "' +
              String(it2.titulo_interno).trim() +
              '": identificador de campanha já existe (slug D17 é imutável e único) — ajuste o tema. Detalhe: ' +
              String(errCamp)
            break
          }
        }
        try {
          txApp.save(rec)
        } catch (errSave) {
          falha =
            'Peça "' + String(it2.titulo_interno).trim() + '": falha ao salvar — ' + String(errSave)
          break
        }
        criados.push(rec.id)
        try {
          var colE = txApp.findCollectionByNameOrId('conteudo_eventos')
          var ev = new Record(colE)
          ev.set('conteudo', rec.id)
          ev.set('etapa_de', '')
          ev.set('etapa_para', 'ideia')
          ev.set('autor', actor.id)
          txApp.save(ev)
        } catch (_) {}
      }
    })
    if (falha) return e.json(400, { error: 'Nada foi criado — ' + falha })
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'conteudos')
      a.set('registro_id', criados.join(','))
      a.set('acao', 'create')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set('estado_posterior', JSON.stringify({ lote: criados.length }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, criados: criados.length, ids: criados })
  },
  $apis.requireAuth(),
)
