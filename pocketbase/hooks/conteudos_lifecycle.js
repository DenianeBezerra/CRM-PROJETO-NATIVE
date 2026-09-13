// T3.21 — SPEC-3-021 Leva A: ciclo de vida do conteúdo (cap. 3.2) + pacote de
// publicação (cap. 6) + permissões (cap. 11).
// Rotas:
//   POST /backend/v1/conteudos                 — criar (etapa ideia)
//   GET  /backend/v1/conteudos                 — lista com filtros (etapa, canal, serie, campanha, responsavel)
//   GET  /backend/v1/conteudos/{id}            — detalhe + eventos + pacote
//   PATCH /backend/v1/conteudos/{id}           — campos editoriais (status NÃO muda aqui)
//   POST /backend/v1/conteudos/{id}/etapa      — avanço/retrocesso com regras do cap. 3.2
// Regras: pronto_para_publicar exige pacote completo; aceite só aprovador (ou
// reserva com ausência registrada — D19); publicado exige url em ≥1 canal e
// grava data_efetiva; retrocesso exige motivo; toda transição grava evento.
// Runtime goja: TODOS os helpers inline (AP-0200) — ETAPAS inline no callback.

routerAdd(
  'POST',
  '/backend/v1/conteudos',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel === 'social_media')
      return e.json(403, {
        error: 'Social media não cria conteúdo — apenas publica e registra o retorno.',
      })
    var body = e.requestInfo().body || {}
    var titulo = String(body.titulo_interno || '').trim()
    var formato = String(body.formato || '').trim()
    var tema = String(body.tema || '').trim()
    var linha = String(body.linha_solucao || '').trim()
    var objetivo = String(body.objetivo || '').trim()
    var canais = body.canais_destino || []
    if (!titulo) return e.json(400, { error: 'Informe o título interno.' })
    if (!tema) return e.json(400, { error: 'Informe o tema.' })
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
    if (FORMATOS.indexOf(formato) < 0) return e.json(400, { error: 'Formato inválido.' })
    var LINHAS = [
      'bpo_financeiro',
      'tesouraria',
      'controladoria',
      'cfo_as_a_service',
      'consultoria',
      'institucional',
    ]
    if (LINHAS.indexOf(linha) < 0) return e.json(400, { error: 'Linha de solução inválida.' })
    var OBJETIVOS = ['autoridade', 'geracao_lead', 'engajamento', 'venda_direta', 'institucional']
    if (OBJETIVOS.indexOf(objetivo) < 0) return e.json(400, { error: 'Objetivo inválido.' })
    if (!canais || canais.length === 0)
      return e.json(400, { error: 'Selecione pelo menos um canal de destino.' })
    var CANAIS = ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site']
    for (var ci = 0; ci < canais.length; ci++) {
      if (CANAIS.indexOf(String(canais[ci])) < 0)
        return e.json(400, { error: 'Canal inválido: ' + String(canais[ci]) })
    }
    var col = $app.findCollectionByNameOrId('conteudos')
    var rec = new Record(col)
    rec.set('titulo_interno', titulo)
    rec.set('formato', formato)
    rec.set('canais_destino', canais)
    rec.set('tema', tema)
    rec.set('linha_solucao', linha)
    rec.set('objetivo', objetivo)
    rec.set('status', 'ideia')
    if (String(body.gancho || '').trim()) rec.set('gancho', String(body.gancho).trim())
    if (String(body.roteiro || '').trim()) rec.set('roteiro', String(body.roteiro).trim())
    if (String(body.legenda || '').trim()) rec.set('legenda', String(body.legenda).trim())
    if (String(body.serie || '').trim()) rec.set('serie', String(body.serie).trim())
    if (String(body.campanha || '').trim()) rec.set('campanha', String(body.campanha).trim())
    if (String(body.responsavel_producao || '').trim())
      rec.set('responsavel_producao', String(body.responsavel_producao).trim())
    if (String(body.aprovador || '').trim()) rec.set('aprovador', String(body.aprovador).trim())
    if (String(body.aprovador_reserva || '').trim())
      rec.set('aprovador_reserva', String(body.aprovador_reserva).trim())
    if (body.data_prevista) rec.set('data_prevista', String(body.data_prevista))
    if (String(body.destino_link || '').trim())
      rec.set('destino_link', String(body.destino_link).trim())
    // Peça avulsa sem campanha: gera identificador D17 (ano-linha-tema) e
    // registra a campanha mínima — o identificador nasce imutável no 1º uso.
    if (!String(body.campanha || '').trim()) {
      var anoC = new Date().getFullYear()
      var temaC = String(titulo || tema || 'conteudo')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
      var slugC = anoC + '-' + linha + '-' + (temaC || 'conteudo')
      var colCamp = $app.findCollectionByNameOrId('campanhas')
      var campRec = new Record(colCamp)
      campRec.set('nome', titulo)
      campRec.set('identificador', slugC)
      campRec.set('tipo', 'organica')
      campRec.set('objetivo', objetivo)
      campRec.set('linha_solucao', linha)
      campRec.set('status', 'planejada')
      try {
        $app.save(campRec)
        rec.set('campanha', campRec.id)
      } catch (errCamp) {
        return e.json(400, {
          error:
            'Identificador de campanha já existe (slug D17 é imutável e único) — ajuste o título da peça. Detalhe: ' +
            String(errCamp),
        })
      }
    }
    if (String(body.observacoes || '').trim())
      rec.set('observacoes', String(body.observacoes).trim())
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao criar conteúdo: ' + String(err) })
    }
    // evento inicial
    try {
      var colE = $app.findCollectionByNameOrId('conteudo_eventos')
      var ev = new Record(colE)
      ev.set('conteudo', rec.id)
      ev.set('etapa_de', '')
      ev.set('etapa_para', 'ideia')
      ev.set('autor', actor.id)
      $app.save(ev)
    } catch (_) {}
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'conteudos')
      a.set('registro_id', rec.id)
      a.set('acao', 'create')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', '')
      a.set(
        'estado_posterior',
        JSON.stringify({ titulo: titulo, formato: formato, canais: canais }),
      )
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, id: rec.id, status: 'ideia' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/conteudos',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var q = e.request.url.query()
    var filtros = []
    var params = {}
    var etapa = String(q.get('etapa') || '').trim()
    if (etapa) {
      filtros.push('status = {:etapa}')
      params.etapa = etapa
    }
    var serie = String(q.get('serie') || '').trim()
    if (serie) {
      filtros.push('serie = {:serie}')
      params.serie = serie
    }
    var campanha = String(q.get('campanha') || '').trim()
    if (campanha) {
      filtros.push('campanha = {:campanha}')
      params.campanha = campanha
    }
    var resp = String(q.get('responsavel') || '').trim()
    if (resp) {
      filtros.push('responsavel_producao = {:resp}')
      params.resp = resp
    }
    var filtro = filtros.length > 0 ? filtros.join(' && ') : ''
    var recs = []
    try {
      recs = $app.findRecordsByFilter('conteudos', filtro, '-created', 500, 0, params)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar conteúdos.' })
    }
    var agora = Date.now()
    var itens = []
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      var dp = String(r.get('data_prevista') || '')
      var atrasado = false
      var st = String(r.get('status') || '')
      if (dp && dp.indexOf('0001-01-01') !== 0 && st !== 'publicado' && st !== 'arquivado') {
        var fimDia = Date.parse(dp.slice(0, 10) + 'T23:59:59Z')
        if (!isNaN(fimDia) && fimDia < agora) atrasado = true
      }
      var serieNome = ''
      try {
        var sid = String(r.get('serie') || '')
        if (sid) serieNome = String($app.findRecordById('series', sid).get('nome') || '')
      } catch (_) {}
      var campNome = ''
      try {
        var cid = String(r.get('campanha') || '')
        if (cid) campNome = String($app.findRecordById('campanhas', cid).get('nome') || '')
      } catch (_) {}
      itens.push({
        id: r.id,
        titulo_interno: String(r.get('titulo_interno') || ''),
        formato: String(r.get('formato') || ''),
        canais_destino: r.get('canais_destino') || [],
        tema: String(r.get('tema') || ''),
        linha_solucao: String(r.get('linha_solucao') || ''),
        objetivo: String(r.get('objetivo') || ''),
        status: st,
        data_prevista: dp,
        data_efetiva: String(r.get('data_efetiva') || ''),
        atrasado: atrasado,
        serie: serieNome,
        campanha: campNome,
        responsavel_producao: String(r.get('responsavel_producao') || ''),
        aprovador: String(r.get('aprovador') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/conteudos/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var r
    try {
      r = $app.findRecordById('conteudos', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Conteúdo não encontrado.' })
    }
    // eventos
    var eventos = []
    try {
      var evs = $app.findRecordsByFilter(
        'conteudo_eventos',
        'conteudo = {:c}',
        '-created',
        200,
        0,
        {
          c: r.id,
        },
      )
      for (var i = 0; i < evs.length; i++) {
        var autorNome = ''
        try {
          autorNome = String(
            $app.findRecordById('_pb_users_auth_', String(evs[i].get('autor') || '')).get('name') ||
              '',
          )
        } catch (_) {}
        eventos.push({
          id: evs[i].id,
          etapa_de: String(evs[i].get('etapa_de') || ''),
          etapa_para: String(evs[i].get('etapa_para') || ''),
          motivo: String(evs[i].get('motivo') || ''),
          autor: autorNome,
          created: String(evs[i].get('created') || ''),
        })
      }
    } catch (_) {}
    // pacote de publicação (cap. 6)
    var capaId = String(r.get('capa') || '')
    var arquivoId = String(r.get('arquivo_final') || '')
    var capa = null
    var arquivo = null
    try {
      if (capaId) {
        var a1 = $app.findRecordById('ativos', capaId)
        var f1 = a1.get('arquivo') || []
        capa = {
          id: a1.id,
          nome: String(a1.get('nome') || ''),
          tipo: String(a1.get('tipo') || ''),
          arquivos: f1,
        }
      }
    } catch (_) {}
    try {
      if (arquivoId) {
        var a2 = $app.findRecordById('ativos', arquivoId)
        var f2 = a2.get('arquivo') || []
        arquivo = {
          id: a2.id,
          nome: String(a2.get('nome') || ''),
          tipo: String(a2.get('tipo') || ''),
          arquivos: f2,
        }
      }
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
    // completude do pacote
    var faltando = []
    if (!arquivoId) faltando.push('arquivo_final')
    if (!capaId) faltando.push('capa')
    if (!String(r.get('legenda') || '').trim()) faltando.push('legenda')
    var canais = r.get('canais_destino') || []
    var linksOk = 0
    for (var c2 = 0; c2 < canais.length; c2++) {
      if (links[String(canais[c2])]) linksOk++
    }
    if (linksOk < canais.length)
      faltando.push('links_rastreaveis (' + linksOk + '/' + canais.length + ' canais)')
    if (
      !String(r.get('data_prevista') || '') ||
      String(r.get('data_prevista') || '').indexOf('0001-01-01') === 0
    )
      faltando.push('data_prevista')
    var serieNome2 = ''
    try {
      var sid2 = String(r.get('serie') || '')
      if (sid2) serieNome2 = String($app.findRecordById('series', sid2).get('nome') || '')
    } catch (_) {}
    var campNome2 = ''
    try {
      var cid2 = String(r.get('campanha') || '')
      if (cid2) campNome2 = String($app.findRecordById('campanhas', cid2).get('nome') || '')
    } catch (_) {}
    var aprovadorNome = ''
    var reservaNome = ''
    try {
      var ap = String(r.get('aprovador') || '')
      if (ap) aprovadorNome = String($app.findRecordById('_pb_users_auth_', ap).get('name') || '')
    } catch (_) {}
    try {
      var ar = String(r.get('aprovador_reserva') || '')
      if (ar) reservaNome = String($app.findRecordById('_pb_users_auth_', ar).get('name') || '')
    } catch (_) {}
    var respNome = ''
    try {
      var rp = String(r.get('responsavel_producao') || '')
      if (rp) respNome = String($app.findRecordById('_pb_users_auth_', rp).get('name') || '')
    } catch (_) {}
    return e.json(200, {
      id: r.id,
      titulo_interno: String(r.get('titulo_interno') || ''),
      formato: String(r.get('formato') || ''),
      canais_destino: canais,
      tema: String(r.get('tema') || ''),
      linha_solucao: String(r.get('linha_solucao') || ''),
      objetivo: String(r.get('objetivo') || ''),
      gancho: String(r.get('gancho') || ''),
      roteiro: String(r.get('roteiro') || ''),
      legenda: String(r.get('legenda') || ''),
      status: String(r.get('status') || ''),
      data_prevista: String(r.get('data_prevista') || ''),
      data_efetiva: String(r.get('data_efetiva') || ''),
      destino_link: String(r.get('destino_link') || ''),
      links_rastreaveis: links,
      url_publicacao: urls,
      observacoes: String(r.get('observacoes') || ''),
      serie: serieNome2,
      campanha: campNome2,
      responsavel_producao_nome: respNome,
      aprovador_nome: aprovadorNome,
      aprovador_reserva_nome: reservaNome,
      ausencia_registrada: r.get('ausencia_registrada') === true,
      capa: capa,
      arquivo_final: arquivo,
      pacote_faltando: faltando,
      pacote_completo: faltando.length === 0,
      eventos: eventos,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PATCH',
  '/backend/v1/conteudos/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel === 'social_media')
      return e.json(403, {
        error: 'Social media não edita conteúdo — apenas registra o retorno da publicação.',
      })
    var r
    try {
      r = $app.findRecordById('conteudos', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Conteúdo não encontrado.' })
    }
    var body = e.requestInfo().body || {}
    var EDITAVEIS = [
      'titulo_interno',
      'formato',
      'canais_destino',
      'serie',
      'campanha',
      'tema',
      'linha_solucao',
      'objetivo',
      'gancho',
      'roteiro',
      'legenda',
      'capa',
      'arquivo_final',
      'responsavel_producao',
      'aprovador',
      'aprovador_reserva',
      'data_prevista',
      'destino_link',
      'observacoes',
      'ausencia_registrada',
    ]
    var mudou = false
    for (var k = 0; k < EDITAVEIS.length; k++) {
      var campo = EDITAVEIS[k]
      if (body[campo] !== undefined) {
        if (campo === 'canais_destino') {
          var CANAIS = ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site']
          var arr = body[campo] || []
          if (arr.length === 0)
            return e.json(400, { error: 'Selecione pelo menos um canal de destino.' })
          for (var ci = 0; ci < arr.length; ci++) {
            if (CANAIS.indexOf(String(arr[ci])) < 0)
              return e.json(400, { error: 'Canal inválido: ' + String(arr[ci]) })
          }
          r.set(campo, arr)
        } else {
          r.set(campo, body[campo])
        }
        mudou = true
      }
    }
    // status NUNCA muda por PATCH direto (cap. 3.2 — só via /etapa)
    if (body.status !== undefined && String(body.status) !== String(r.get('status') || '')) {
      return e.json(400, {
        error: 'Status muda apenas pela rota de etapa (POST /conteudos/{id}/etapa).',
      })
    }
    if (!mudou) return e.json(400, { error: 'Nenhum campo editável informado.' })
    try {
      $app.save(r)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar: ' + String(err) })
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
          campos: EDITAVEIS.filter(function (f) {
            return body[f] !== undefined
          }),
        }),
      )
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, id: r.id })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/conteudos/{id}/etapa',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ETAPAS = [
      'ideia',
      'pauta_aprovada',
      'roteiro',
      'producao',
      'edicao',
      'aprovacao',
      'pronto_para_publicar',
      'agendado',
      'publicado',
      'arquivado',
    ]
    var r
    try {
      r = $app.findRecordById('conteudos', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Conteúdo não encontrado.' })
    }
    var body = e.requestInfo().body || {}
    var destino = String(body.etapa || '').trim()
    var motivo = String(body.motivo || '').trim()
    var atual = String(r.get('status') || '')
    if (ETAPAS.indexOf(destino) < 0) return e.json(400, { error: 'Etapa inválida.' })
    if (destino === atual) return e.json(400, { error: 'O conteúdo já está nesta etapa.' })
    if (atual === 'arquivado')
      return e.json(400, {
        error:
          'Conteúdo arquivado é estado terminal — não avança. Crie uma nova peça (nova edição da pauta) ou registre a decisão nas observações.',
      })

    // ---- Regra 1: pronto_para_publicar exige pacote completo (cap. 6) ----
    if (destino === 'pronto_para_publicar') {
      var faltando = []
      if (!String(r.get('arquivo_final') || '')) faltando.push('arquivo_final')
      if (!String(r.get('capa') || '')) faltando.push('capa')
      if (!String(r.get('legenda') || '').trim()) faltando.push('legenda')
      var links = {}
      try {
        links = JSON.parse(String(r.get('links_rastreaveis') || '{}'))
        if (!links || typeof links !== 'object') links = {}
      } catch (_) {
        links = {}
      }
      var canais = r.get('canais_destino') || []
      var linksOk = 0
      for (var c2 = 0; c2 < canais.length; c2++) {
        if (links[String(canais[c2])]) linksOk++
      }
      if (linksOk < canais.length)
        faltando.push('links_rastreaveis (' + linksOk + '/' + canais.length + ' canais)')
      var dp = String(r.get('data_prevista') || '')
      if (!dp || dp.indexOf('0001-01-01') === 0) faltando.push('data_prevista')
      if (faltando.length > 0) {
        return e.json(400, {
          error: 'Pacote incompleto — itens faltando: ' + faltando.join(', '),
          faltando: faltando,
        })
      }
      // ---- Regra 2: aceite só do aprovador (ou reserva com ausência registrada — D19) ----
      var papel = String(actor.get('role') || '')
      var ehAprovador = String(r.get('aprovador') || '') === actor.id
      var ehReserva =
        String(r.get('aprovador_reserva') || '') === actor.id &&
        r.get('ausencia_registrada') === true
      if (!ehAprovador && !ehReserva) {
        return e.json(403, {
          error:
            'Somente o aprovador definido (ou o aprovador reserva com ausência registrada) dá o aceite final.',
        })
      }
    }

    // ---- Regra 3: publicado exige url em ≥ 1 canal e grava data_efetiva ----
    if (destino === 'publicado') {
      var urls = {}
      try {
        urls = JSON.parse(String(r.get('url_publicacao') || '{}'))
        if (!urls || typeof urls !== 'object') urls = {}
      } catch (_) {
        urls = {}
      }
      var temUrl = false
      for (var u in urls) {
        if (String(urls[u] || '').trim()) temUrl = true
      }
      if (!temUrl) {
        return e.json(400, {
          error:
            'Publicado exige o endereço da publicação em pelo menos um canal (url_publicacao).',
        })
      }
      if (
        !String(r.get('data_efetiva') || '') ||
        String(r.get('data_efetiva') || '').indexOf('0001-01-01') === 0
      ) {
        r.set('data_efetiva', new Date().toISOString())
      }
    }

    // ---- Regra 4: retrocesso exige motivo ----
    var IDX_ATUAL = ETAPAS.indexOf(atual)
    var IDX_DESTINO = ETAPAS.indexOf(destino)
    var retrocesso = IDX_DESTINO < IDX_ATUAL
    if (retrocesso && motivo.length < 10) {
      return e.json(400, {
        error:
          'Retrocesso exige o motivo (mínimo 10 caracteres) — reprovação faz parte do processo.',
      })
    }

    var de = atual
    r.set('status', destino)
    try {
      $app.save(r)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar etapa: ' + String(err) })
    }
    // evento na linha do tempo
    try {
      var colE = $app.findCollectionByNameOrId('conteudo_eventos')
      var ev = new Record(colE)
      ev.set('conteudo', r.id)
      ev.set('etapa_de', de)
      ev.set('etapa_para', destino)
      if (motivo) ev.set('motivo', motivo)
      ev.set('autor', actor.id)
      $app.save(ev)
    } catch (_) {}
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var a = new Record(audit)
      a.set('entidade', 'conteudos')
      a.set('registro_id', r.id)
      a.set('acao', 'update')
      a.set('ator_id', actor.id)
      a.set('ocorrido_em', new Date().toISOString())
      a.set('estado_anterior', JSON.stringify({ status: de }))
      a.set('estado_posterior', JSON.stringify({ status: destino, motivo: motivo }))
      $app.save(a)
    } catch (_) {}
    return e.json(200, { ok: true, status: destino, retrocesso: retrocesso })
  },
  $apis.requireAuth(),
)
