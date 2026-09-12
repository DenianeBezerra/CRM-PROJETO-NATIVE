// T3.08 — SPEC-3-007: comentários com menção, notificações privadas e fila pessoal.
// Rotas:
//   GET  /backend/v1/meu-dia                        — fila pessoal (auth)
//   GET  /backend/v1/notificacoes                   — lista do usuário (auth)
//   POST /backend/v1/notificacoes/{id}/lida         — marca lida (dono apenas)
//   GET  /backend/v1/negocios/{id}/comentarios      — lista do negócio (auth)
//   POST /backend/v1/negocios/{id}/comentarios      — cria comentário (auth)
// Menção: padrão @Nome no texto; o hook resolve usuários ativos server-side
// (users.list é restrita — nomes NUNCA vêm da UI). Menção a nome inexistente
// não bloqueia (fica como texto). Notificações são criadas SOMENTE server-side.
// Runtime goja: lógica inline em cada callback (AP-0200); datas PB " " → "T".
routerAdd(
  'GET',
  '/backend/v1/meu-dia',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var fontesComErro = []
    var agora = Date.now()

    // 1. Tarefas abertas atribuídas a mim (com atraso calculado).
    var tarefas = []
    try {
      var ts = $app.findRecordsByFilter(
        'tarefas',
        "responsavel = {:u} && status = 'aberta'",
        'prazo',
        200,
        0,
        { u: actor.id },
      )
      for (var i = 0; i < ts.length; i++) {
        var t = ts[i]
        var prazo = String(t.get('prazo') || '')
        var atrasada = false
        var diasAtraso = 0
        if (prazo && prazo.indexOf('0001-01-01') !== 0) {
          var msP = Date.parse(prazo.replace(' ', 'T'))
          if (!isNaN(msP) && msP < agora) {
            atrasada = true
            diasAtraso = Math.floor((agora - msP) / 86400000)
          }
        }
        var negocioTitulo = ''
        try {
          negocioTitulo = String(
            $app.findRecordById('negocios', String(t.get('negocio') || '')).get('titulo') || '',
          )
        } catch (_) {}
        tarefas.push({
          id: t.id,
          titulo: String(t.get('titulo') || ''),
          negocio: String(t.get('negocio') || ''),
          negocio_titulo: negocioTitulo,
          prioridade: String(t.get('prioridade') || ''),
          prazo: prazo,
          atrasada: atrasada,
          dias_atraso: diasAtraso,
        })
      }
    } catch (errT) {
      fontesComErro.push('tarefas')
    }

    // 2. Oportunidades ativas com próxima ação vencida onde sou responsável.
    var acoesVencidas = []
    try {
      var FINAL = ['fechado_ganho', 'fechado_perdido']
      var ns = $app.findRecordsByFilter(
        'negocios',
        'responsavel = {:u} && arquivado != true',
        '-proxima_acao_em',
        500,
        0,
        { u: actor.id },
      )
      for (var n = 0; n < ns.length; n++) {
        var neg = ns[n]
        var estagio = String(neg.get('estagio') || '')
        if (FINAL.indexOf(estagio) >= 0) continue
        var quando = String(neg.get('proxima_acao_em') || '')
        if (!quando || quando.indexOf('0001-01-01') === 0) continue
        var msQ = Date.parse(quando.replace(' ', 'T'))
        if (isNaN(msQ) || msQ >= agora) continue
        acoesVencidas.push({
          id: neg.id,
          titulo: String(neg.get('titulo') || ''),
          estagio: estagio,
          proxima_acao_em: quando,
          proxima_acao_descricao: String(neg.get('proxima_acao_descricao') || ''),
          dias_atraso: Math.floor((agora - msQ) / 86400000),
        })
      }
    } catch (errN) {
      fontesComErro.push('negocios')
    }

    // 3. Menções recentes (notificações tipo mencao, últimos 7 dias).
    var mencoes = []
    try {
      var seteDias = new Date(agora - 7 * 86400000).toISOString().replace('T', ' ')
      var nots = $app.findRecordsByFilter(
        'notificacoes',
        "usuario = {:u} && tipo = 'mencao' && created > {:desde}",
        '-created',
        50,
        0,
        { u: actor.id, desde: seteDias },
      )
      for (var m = 0; m < nots.length; m++) {
        var nt = nots[m]
        var negocioId = String(nt.get('origem') || '')
        var negocioTituloM = ''
        if (negocioId) {
          try {
            negocioTituloM = String($app.findRecordById('negocios', negocioId).get('titulo') || '')
          } catch (_) {}
        }
        var textoM = ''
        if (String(nt.get('comentario') || '')) {
          try {
            textoM = String(
              $app.findRecordById('comentarios', String(nt.get('comentario'))).get('texto') || '',
            )
          } catch (_) {}
        }
        mencoes.push({
          id: nt.id,
          lida: nt.get('lida') === true,
          negocio: negocioId,
          negocio_titulo: negocioTituloM,
          texto: textoM.slice(0, 200),
          created: String(nt.get('created') || ''),
        })
      }
    } catch (errM) {
      fontesComErro.push('notificacoes')
    }

    // 4. Contagem de notificações não lidas.
    var naoLidas = 0
    try {
      var pend = $app.findRecordsByFilter(
        'notificacoes',
        'usuario = {:u} && lida != true',
        '-created',
        500,
        0,
        { u: actor.id },
      )
      naoLidas = pend.length
    } catch (errC) {
      fontesComErro.push('notificacoes')
    }

    return e.json(200, {
      usuario: actor.id,
      tarefas_abertas: { total: tarefas.length, itens: tarefas },
      acoes_vencidas: { total: acoesVencidas.length, itens: acoesVencidas },
      mencoes_recentes: { total: mencoes.length, itens: mencoes },
      notificacoes_nao_lidas: naoLidas,
      fontes_com_erro: fontesComErro,
    })
  },
  $apis.requireAuth(),
)

// Lista de notificações do usuário (limite 50, filtro lida opcional).
routerAdd(
  'GET',
  '/backend/v1/notificacoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var lidaFiltro = String(e.request.url.query().get('lida') || '').trim()
    var filtro = 'usuario = {:u}'
    if (lidaFiltro === 'false') filtro += ' && lida != true'
    if (lidaFiltro === 'true') filtro += ' && lida = true'
    var nots = []
    try {
      nots = $app.findRecordsByFilter('notificacoes', filtro, '-created', 50, 0, { u: actor.id })
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar notificações.' })
    }
    var itens = []
    for (var i = 0; i < nots.length; i++) {
      var nt = nots[i]
      var negocioId = String(nt.get('origem') || '')
      var negocioTitulo = ''
      if (negocioId) {
        try {
          negocioTitulo = String($app.findRecordById('negocios', negocioId).get('titulo') || '')
        } catch (_) {}
      }
      itens.push({
        id: nt.id,
        tipo: String(nt.get('tipo') || ''),
        lida: nt.get('lida') === true,
        negocio: negocioId,
        negocio_titulo: negocioTitulo,
        origem_tarefa: String(nt.get('origem_tarefa') || ''),
        created: String(nt.get('created') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

// Marcar notificação como lida — apenas o dono; só lida/lida_em mudam.
routerAdd(
  'POST',
  '/backend/v1/notificacoes/{id}/lida',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var not
    try {
      not = $app.findRecordById('notificacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Notificação não encontrada.' })
    }
    if (String(not.get('usuario') || '') !== actor.id) {
      return e.json(403, { error: 'Notificação pertence a outro usuário.' })
    }
    if (not.get('lida') === true) {
      return e.json(400, { error: 'Notificação já está marcada como lida.' })
    }
    not.set('lida', true)
    not.set('lida_em', new Date().toISOString().replace('T', ' '))
    try {
      $app.save(not)
    } catch (err) {
      return e.json(500, { error: 'Falha ao marcar como lida.' })
    }
    return e.json(200, { ok: true, lida_em: String(not.get('lida_em') || '') })
  },
  $apis.requireAuth(),
)

// Lista de comentários do negócio (com nome do autor server-side).
routerAdd(
  'GET',
  '/backend/v1/negocios/{id}/comentarios',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var negocioId = e.request.pathValue('id')
    try {
      $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }
    var coms = []
    try {
      coms = $app.findRecordsByFilter('comentarios', 'negocio = {:n}', '-created', 200, 0, {
        n: negocioId,
      })
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar comentários.' })
    }
    var itens = []
    for (var i = 0; i < coms.length; i++) {
      var c = coms[i]
      var autorNome = ''
      try {
        autorNome = String(
          $app.findRecordById('_pb_users_auth_', String(c.get('autor') || '')).get('name') || '',
        )
      } catch (_) {}
      var mencoesNomes = []
      try {
        var ids = JSON.parse(String(c.get('mencoes') || '[]'))
        for (var mi = 0; mi < ids.length; mi++) {
          try {
            mencoesNomes.push(
              String($app.findRecordById('_pb_users_auth_', String(ids[mi])).get('name') || ''),
            )
          } catch (_) {}
        }
      } catch (_) {}
      itens.push({
        id: c.id,
        autor: String(c.get('autor') || ''),
        autor_nome: autorNome,
        texto: String(c.get('texto') || ''),
        mencoes_nomes: mencoesNomes,
        tarefa: String(c.get('tarefa') || ''),
        created: String(c.get('created') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

// Criar comentário: valida texto, extrai menções server-side, grava
// notificações (mencao para cada mencionado ≠ autor) e audita.
routerAdd(
  'POST',
  '/backend/v1/negocios/{id}/comentarios',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var negocioId = e.request.pathValue('id')
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }
    var body = e.requestInfo().body || {}
    var texto = String(body.texto || '').trim()
    if (!texto) return e.json(400, { error: 'O comentário não pode ficar vazio.' })
    if (texto.length > 2000) return e.json(400, { error: 'Comentário excede 2000 caracteres.' })

    // Menções: @Nome — resolve usuários ATIVOS pelo name exato (server-side).
    var mencoesIds = []
    try {
      var usuarios = $app.findRecordsByFilter('_pb_users_auth_', 'active = true', '', 200, 0)
      for (var u = 0; u < usuarios.length; u++) {
        var nome = String(usuarios[u].get('name') || '').trim()
        if (nome && texto.indexOf('@' + nome) >= 0) {
          var ja = false
          for (var j = 0; j < mencoesIds.length; j++)
            if (mencoesIds[j] === usuarios[u].id) ja = true
          if (!ja) mencoesIds.push(usuarios[u].id)
        }
      }
    } catch (errU) {
      // falha ao listar usuários: comentário segue sem menções (texto preservado)
    }

    var col
    try {
      col = $app.findCollectionByNameOrId('comentarios')
    } catch (errC) {
      return e.json(500, { error: 'Coleção de comentários indisponível.' })
    }
    var rec = new Record(col)
    rec.set('negocio', negocioId)
    if (String(body.tarefa || '').trim()) rec.set('tarefa', String(body.tarefa).trim())
    rec.set('autor', actor.id)
    rec.set('texto', texto)
    rec.set('mencoes', JSON.stringify(mencoesIds))
    try {
      $app.save(rec)
    } catch (errS) {
      return e.json(400, { error: 'Falha ao registrar comentário: ' + String(errS) })
    }

    // Notificações: mencao para cada mencionado (≠ autor); comentario para o
    // responsável do negócio (se ≠ autor e sem menção explícita).
    var notCol
    try {
      notCol = $app.findCollectionByNameOrId('notificacoes')
    } catch (errN) {
      notCol = null
    }
    var notificados = []
    if (notCol) {
      for (var mi = 0; mi < mencoesIds.length; mi++) {
        if (mencoesIds[mi] === actor.id) continue
        try {
          var n1 = new Record(notCol)
          n1.set('usuario', mencoesIds[mi])
          n1.set('tipo', 'mencao')
          n1.set('origem', negocioId)
          n1.set('comentario', rec.id)
          n1.set('lida', false)
          $app.save(n1)
          notificados.push(mencoesIds[mi])
        } catch (errN1) {}
      }
      var respNegocio = String(negocio.get('responsavel') || '')
      if (respNegocio && respNegocio !== actor.id && mencoesIds.indexOf(respNegocio) < 0) {
        try {
          var n2 = new Record(notCol)
          n2.set('usuario', respNegocio)
          n2.set('tipo', 'comentario')
          n2.set('origem', negocioId)
          n2.set('comentario', rec.id)
          n2.set('lida', false)
          $app.save(n2)
          notificados.push(respNegocio)
        } catch (errN2) {}
      }
    }

    // Auditoria (snapshot mínimo — sem conteúdo do comentário).
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'comentarios')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'create')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({
          negocio: negocioId,
          mencoes: mencoesIds.length,
          notificados: notificados.length,
        }),
      )
      $app.save(ev)
    } catch (errA) {
      $app.logger().error('T308 auditoria comentário falhou', 'err', String(errA))
    }

    return e.json(200, {
      ok: true,
      id: rec.id,
      mencoes: mencoesIds.length,
      notificados: notificados.length,
    })
  },
  $apis.requireAuth(),
)
