// T3.12 — SPEC-3-012: Motor de Rotinas + Exceções.
// Rotas:
//   POST /backend/v1/obrigacoes/gerar            — executa o motor (admin)
//   GET  /backend/v1/obrigacoes                  — lista (auth; ?dia=YYYY-MM-DD, ?meus=1)
//   POST /backend/v1/obrigacoes/{id}/baixa       — baixa em 1 toque (auth)
//   POST /backend/v1/obrigacoes/baixa-lote       — baixa em lote por ids (auth)
//   POST /backend/v1/obrigacoes/{id}/bloquear    — bloqueia com motivo obrigatório (auth)
//   GET  /backend/v1/excecoes                    — lista exceções (auth)
// Cron diário 06:05 BRT (09:05 UTC).
// NENHUMA rota cria obrigação manualmente — CA-3-042.
// AP-0200 TOTAL: TODOS os helpers vivem DENTRO de cada escopo (callback/cron) —
// helpers top-level não são visíveis em funções aninhadas no runtime goja.

routerAdd(
  'POST',
  '/backend/v1/obrigacoes/gerar',
  (e) => {
    var FERIADOS_FIXOS = [
      '01-01',
      '04-21',
      '05-01',
      '06-11',
      '09-07',
      '10-12',
      '11-02',
      '11-15',
      '11-20',
      '12-25',
    ]
    var ehDiaUtil = function (d) {
      var dow = d.getUTCDay()
      if (dow === 0 || dow === 6) return false
      var mmdd = ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2)
      return FERIADOS_FIXOS.indexOf(mmdd) < 0
    }
    var ajustarDiaUtil = function (d) {
      var guard = 0
      while (!ehDiaUtil(d) && guard < 30) {
        d.setUTCDate(d.getUTCDate() - 1)
        guard++
      }
      return d
    }
    var dataISO = function (d) {
      return d.toISOString().slice(0, 10) + ' 00:00:00.000Z'
    }
    var datasDoCiclo = function (ficha, servico, hoje) {
      var datas = []
      var periodicidade = String(ficha.get('periodicidade_projecao') || '')
      var diasRef = String(ficha.get('dias_referencia') || '').toLowerCase()
      if (servico === 'contas_a_pagar' && periodicidade) {
        if (periodicidade === 'semanal') {
          var alvoDow = -1
          if (diasRef.indexOf('segunda') >= 0) alvoDow = 1
          else if (diasRef.indexOf('terça') >= 0 || diasRef.indexOf('terca') >= 0) alvoDow = 2
          else if (diasRef.indexOf('quarta') >= 0) alvoDow = 3
          else if (diasRef.indexOf('quinta') >= 0) alvoDow = 4
          else if (diasRef.indexOf('sexta') >= 0) alvoDow = 5
          if (alvoDow >= 0) {
            var d1 = new Date(hoje.getTime())
            while (d1.getUTCDay() !== alvoDow || d1.getTime() <= hoje.getTime()) {
              d1.setUTCDate(d1.getUTCDate() + 1)
            }
            var d2 = new Date(d1.getTime())
            d2.setUTCDate(d2.getUTCDate() + 7)
            datas.push(ajustarDiaUtil(new Date(d1.getTime())))
            datas.push(ajustarDiaUtil(new Date(d2.getTime())))
          }
        } else {
          var nums = diasRef.match(/\d{1,2}/g) || []
          var passou = []
          for (var i = 0; i < nums.length; i++) {
            var dia = parseInt(nums[i], 10)
            if (dia >= 1 && dia <= 31) passou.push(dia)
          }
          passou.sort(function (a, b) {
            return a - b
          })
          var mesAtual = hoje.getUTCMonth()
          var anoAtual = hoje.getUTCFullYear()
          var candidatos = []
          for (var m = 0; m < 2; m++) {
            var mes = mesAtual + m
            var ano = anoAtual
            if (mes > 11) {
              mes -= 12
              ano++
            }
            for (var j = 0; j < passou.length; j++) {
              var dd = new Date(Date.UTC(ano, mes, passou[j]))
              if (dd.getTime() > hoje.getTime()) candidatos.push(dd)
            }
          }
          candidatos.sort(function (a, b) {
            return a.getTime() - b.getTime()
          })
          for (var k = 0; k < candidatos.length && k < 2; k++) {
            datas.push(ajustarDiaUtil(new Date(candidatos[k].getTime())))
          }
        }
      }
      if (servico === 'faturamento') {
        var diaEm = String(ficha.get('dia_emissao') || '').toLowerCase()
        var numsF = diaEm.match(/\d{1,2}/g) || []
        var diasF = []
        for (var fi = 0; fi < numsF.length; fi++) {
          var df = parseInt(numsF[fi], 10)
          if (df >= 1 && df <= 31) diasF.push(df)
        }
        diasF.sort(function (a, b) {
          return a - b
        })
        var candF = []
        for (var fm = 0; fm < 2; fm++) {
          var mesF = hoje.getUTCMonth() + fm
          var anoF = hoje.getUTCFullYear()
          if (mesF > 11) {
            mesF -= 12
            anoF++
          }
          for (var fj = 0; fj < diasF.length; fj++) {
            var ddf = new Date(Date.UTC(anoF, mesF, diasF[fj]))
            if (ddf.getTime() > hoje.getTime()) candF.push(ddf)
          }
        }
        candF.sort(function (a, b) {
          return a.getTime() - b.getTime()
        })
        for (var fk = 0; fk < candF.length && fk < 2; fk++) {
          datas.push(ajustarDiaUtil(new Date(candF[fk].getTime())))
        }
      }
      if (servico === 'conciliacao') {
        var freq = String(ficha.get('frequencia_conciliacao') || '')
        if (freq === 'diaria') {
          var dC1 = new Date(hoje.getTime())
          dC1.setUTCDate(dC1.getUTCDate() + 1)
          var dC2 = new Date(hoje.getTime())
          dC2.setUTCDate(dC2.getUTCDate() + 2)
          datas.push(ajustarDiaUtil(dC1), ajustarDiaUtil(dC2))
        } else if (freq === 'semanal') {
          var dS1 = new Date(hoje.getTime())
          dS1.setUTCDate(dS1.getUTCDate() + 7)
          var dS2 = new Date(hoje.getTime())
          dS2.setUTCDate(dS2.getUTCDate() + 14)
          datas.push(ajustarDiaUtil(dS1), ajustarDiaUtil(dS2))
        }
      }
      if (servico === 'fechamento') {
        var prazoE = String(ficha.get('prazo_entrega') || '').toLowerCase()
        var numsP = prazoE.match(/\d{1,2}/g) || []
        if (numsP.length > 0) {
          var diaP = parseInt(numsP[0], 10)
          var mesP = hoje.getUTCMonth() + 1
          var anoP = hoje.getUTCFullYear()
          if (mesP > 11) {
            mesP -= 12
            anoP++
          }
          datas.push(ajustarDiaUtil(new Date(Date.UTC(anoP, mesP, diaP))))
        }
      }
      return datas
    }
    var tiposPorServico = function (servico) {
      if (servico === 'contas_a_pagar')
        return ['coleta_canal', 'lancamento', 'projecao', 'envio_autorizacao', 'cadastro_banco']
      if (servico === 'faturamento')
        return ['relatorio_faturamento', 'emissao_nota', 'entrega_nota']
      if (servico === 'conciliacao') return ['conciliacao']
      if (servico === 'fechamento') return ['fechamento', 'entrega_contabilidade']
      return []
    }
    var offsetTipo = function (tipo) {
      if (tipo === 'coleta_canal') return -3
      if (tipo === 'lancamento') return -2
      if (tipo === 'projecao') return -1
      if (tipo === 'envio_autorizacao') return -1
      if (tipo === 'cadastro_banco') return 0
      if (tipo === 'relatorio_faturamento') return -3
      if (tipo === 'emissao_nota') return 0
      if (tipo === 'entrega_nota') return 1
      if (tipo === 'conciliacao') return 0
      if (tipo === 'fechamento') return -5
      if (tipo === 'entrega_contabilidade') return 0
      return 0
    }
    var gerarMotor = function () {
      var geradas = 0
      var ignoradas = 0
      var agoraISO = new Date().toISOString()
      var hoje = new Date()
      var fichas = $app.findRecordsByFilter(
        'fichas_operacionais',
        "status_operacional = 'ativo'",
        '',
        200,
        0,
      )
      for (var f = 0; f < fichas.length; f++) {
        var ficha = fichas[f]
        var clienteId = String(ficha.get('empresa') || '')
        var titular = String(ficha.get('responsavel_principal') || '')
        var reserva = String(ficha.get('responsavel_reserva') || '')
        var substituicao = false
        var responsavel = titular
        if (titular) {
          try {
            var u = $app.findRecordById('_pb_users_auth_', titular)
            if (u.get('active') === false) {
              responsavel = reserva
              substituicao = true
            }
          } catch (_) {
            responsavel = reserva
            substituicao = true
          }
        } else if (reserva) {
          responsavel = reserva
          substituicao = true
        }
        if (!responsavel) continue
        var servicos = String(ficha.get('servicos_contratados') || '').split(',')
        for (var s = 0; s < servicos.length; s++) {
          var servico = servicos[s].trim()
          if (!servico) continue
          var tipos = tiposPorServico(servico)
          if (tipos.length === 0) continue
          var datas = datasDoCiclo(ficha, servico, hoje)
          for (var d = 0; d < datas.length; d++) {
            var prevista = datas[d]
            for (var t = 0; t < tipos.length; t++) {
              var tipo = tipos[t]
              var off = offsetTipo(tipo)
              var dt = new Date(prevista.getTime())
              dt.setUTCDate(dt.getUTCDate() + off)
              if (!ehDiaUtil(dt)) dt = ajustarDiaUtil(dt)
              var prazo = new Date(dt.getTime())
              prazo.setUTCHours(21, 0, 0, 0)
              var cicloChave = clienteId + '|' + tipo + '|' + dt.toISOString().slice(0, 10)
              var existentes = $app.findRecordsByFilter(
                'obrigacoes',
                'ciclo_chave = {:c}',
                '',
                1,
                0,
                { c: cicloChave },
              )
              if (existentes.length > 0) {
                ignoradas++
                continue
              }
              var col = $app.findCollectionByNameOrId('obrigacoes')
              var rec = new Record(col)
              rec.set('tipo', tipo)
              rec.set('cliente', clienteId)
              rec.set('ficha', ficha.id)
              rec.set('responsavel', responsavel)
              rec.set('substituicao_aplicada', substituicao)
              rec.set('data_prevista', dataISO(dt))
              rec.set('prazo_limite', prazo.toISOString().replace('T', ' '))
              rec.set('status', 'prevista')
              rec.set('gerada_em', agoraISO)
              rec.set('ciclo_chave', cicloChave)
              try {
                $app.save(rec)
                geradas++
              } catch (errS) {
                ignoradas++
              }
            }
          }
        }
      }
      return { geradas: geradas, ignoradas: ignoradas }
    }
    var avaliarAtrasos = function () {
      var marcadas = 0
      var excecoesNovas = 0
      var agora = Date.now()
      var abertas = $app.findRecordsByFilter(
        'obrigacoes',
        "status = 'prevista' || status = 'em_execucao'",
        '',
        500,
        0,
      )
      for (var i = 0; i < abertas.length; i++) {
        var ob = abertas[i]
        var prazo = String(ob.get('prazo_limite') || '')
        if (!prazo || prazo.indexOf('0001-01-01') === 0) continue
        var msP = Date.parse(prazo.replace(' ', 'T'))
        if (isNaN(msP) || msP >= agora) continue
        ob.set('status', 'atrasada')
        $app.save(ob)
        marcadas++
        var jaExiste = $app.findRecordsByFilter(
          'excecoes',
          "obrigacao = {:o} && tipo = 'obrigacao_atrasada' && status = 'aberta'",
          '',
          1,
          0,
          { o: ob.id },
        )
        if (jaExiste.length === 0) {
          var col = $app.findCollectionByNameOrId('excecoes')
          var ex = new Record(col)
          ex.set('tipo', 'obrigacao_atrasada')
          ex.set('cliente', String(ob.get('cliente') || ''))
          ex.set('obrigacao', ob.id)
          ex.set(
            'descricao',
            'Obrigação ' +
              String(ob.get('tipo') || '') +
              ' venceu em ' +
              prazo.slice(0, 10) +
              ' sem baixa.',
          )
          ex.set('aberta_em', new Date().toISOString())
          ex.set('destinatario_analista', String(ob.get('responsavel') || ''))
          ex.set('escalada_coordenacao', false)
          ex.set('status', 'aberta')
          try {
            $app.save(ex)
            excecoesNovas++
          } catch (_) {}
        }
      }
      return { marcadas: marcadas, excecoes: excecoesNovas }
    }
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Execução do motor é exclusiva de administradores.' })
    }
    var r1 = gerarMotor()
    var r2 = avaliarAtrasos()
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'obrigacoes')
      ev.set('registro_id', '')
      ev.set('acao', 'motor_executado')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({
          geradas: r1.geradas,
          ignoradas: r1.ignoradas,
          atrasadas: r2.marcadas,
          excecoes: r2.excecoes,
        }),
      )
      $app.save(ev)
    } catch (_) {}
    return e.json(200, {
      ok: true,
      geradas: r1.geradas,
      ignoradas: r1.ignoradas,
      marcadas_atrasadas: r2.marcadas,
      excecoes_abertas: r2.excecoes,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/obrigacoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var dia = String(e.request.url.query().get('dia') || '').trim()
    var meus = String(e.request.url.query().get('meus') || '').trim()
    var filtro = "status != 'concluida' && status != 'nao_aplicavel'"
    var params = {}
    if (dia) {
      filtro += ' && data_prevista <= {:dia}'
      params.dia = dia + ' 23:59:59.000Z'
    }
    if (meus === '1') {
      filtro += ' && responsavel = {:u}'
      params.u = actor.id
    }
    var obs = []
    try {
      obs = $app.findRecordsByFilter('obrigacoes', filtro, 'prazo_limite', 300, 0, params)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar obrigações.' })
    }
    var itens = []
    for (var i = 0; i < obs.length; i++) {
      var ob = obs[i]
      var clienteNome = ''
      try {
        clienteNome = String(
          $app.findRecordById('empresas', String(ob.get('cliente') || '')).get('nome') || '',
        )
      } catch (_) {}
      itens.push({
        id: ob.id,
        tipo: String(ob.get('tipo') || ''),
        cliente: String(ob.get('cliente') || ''),
        cliente_nome: clienteNome,
        ficha: String(ob.get('ficha') || ''),
        responsavel: String(ob.get('responsavel') || ''),
        substituicao_aplicada: ob.get('substituicao_aplicada') === true,
        data_prevista: String(ob.get('data_prevista') || ''),
        prazo_limite: String(ob.get('prazo_limite') || ''),
        status: String(ob.get('status') || ''),
        motivo_bloqueio: String(ob.get('motivo_bloqueio') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/obrigacoes/{id}/baixa',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ob
    try {
      ob = $app.findRecordById('obrigacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Obrigação não encontrada.' })
    }
    var status = String(ob.get('status') || '')
    if (status === 'concluida') return e.json(400, { error: 'Obrigação já concluída.' })
    if (status === 'bloqueada')
      return e.json(400, { error: 'Obrigação bloqueada — resolva o bloqueio antes de baixar.' })
    ob.set('status', 'concluida')
    ob.set('data_conclusao', new Date().toISOString().replace('T', ' '))
    ob.set('concluida_por', actor.id)
    var body = e.requestInfo().body || {}
    if (String(body.evidencia || '').trim()) ob.set('evidencia', String(body.evidencia).trim())
    try {
      $app.save(ob)
    } catch (err) {
      return e.json(400, { error: 'Falha ao baixar: ' + String(err) })
    }
    try {
      var exs = $app.findRecordsByFilter(
        'excecoes',
        "obrigacao = {:o} && tipo = 'obrigacao_atrasada' && status = 'aberta'",
        '',
        5,
        0,
        { o: ob.id },
      )
      for (var x = 0; x < exs.length; x++) {
        exs[x].set('status', 'resolvida')
        exs[x].set('resolvida_em', new Date().toISOString())
        $app.save(exs[x])
      }
    } catch (_) {}
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'obrigacoes')
      ev.set('registro_id', ob.id)
      ev.set('acao', 'baixa')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', JSON.stringify({ status: status }))
      ev.set('estado_posterior', JSON.stringify({ status: 'concluida' }))
      $app.save(ev)
    } catch (_) {}
    return e.json(200, { ok: true, status: 'concluida' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/obrigacoes/baixa-lote',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var body = e.requestInfo().body || {}
    var ids = body.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return e.json(400, { error: 'Informe a lista de ids (ids).' })
    }
    if (ids.length > 100) return e.json(400, { error: 'Lote limitado a 100 obrigações.' })
    var baixadas = 0
    var erros = []
    for (var i = 0; i < ids.length; i++) {
      var ob
      try {
        ob = $app.findRecordById('obrigacoes', String(ids[i]))
      } catch (_) {
        erros.push(String(ids[i]) + ': não encontrada')
        continue
      }
      var status = String(ob.get('status') || '')
      if (status === 'concluida' || status === 'bloqueada') {
        erros.push(String(ids[i]) + ': status ' + status)
        continue
      }
      ob.set('status', 'concluida')
      ob.set('data_conclusao', new Date().toISOString().replace('T', ' '))
      ob.set('concluida_por', actor.id)
      try {
        $app.save(ob)
        baixadas++
      } catch (errS) {
        erros.push(String(ids[i]) + ': falha ao salvar')
      }
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'obrigacoes')
      ev.set('registro_id', '')
      ev.set('acao', 'baixa_lote')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', JSON.stringify({ baixadas: baixadas, erros: erros.length }))
      $app.save(ev)
    } catch (_) {}
    return e.json(200, { ok: true, baixadas: baixadas, erros: erros })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/obrigacoes/{id}/bloquear',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ob
    try {
      ob = $app.findRecordById('obrigacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Obrigação não encontrada.' })
    }
    var status = String(ob.get('status') || '')
    if (status === 'concluida')
      return e.json(400, { error: 'Obrigação concluída não pode ser bloqueada.' })
    var body = e.requestInfo().body || {}
    var motivo = String(body.motivo_bloqueio || '').trim()
    if (motivo.length < 5) {
      return e.json(400, { error: 'Bloqueio exige motivo (mínimo 5 caracteres).' })
    }
    ob.set('status', 'bloqueada')
    ob.set('motivo_bloqueio', motivo)
    try {
      $app.save(ob)
    } catch (err) {
      return e.json(400, { error: 'Falha ao bloquear: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'obrigacoes')
      ev.set('registro_id', ob.id)
      ev.set('acao', 'bloqueio')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', JSON.stringify({ status: status }))
      ev.set(
        'estado_posterior',
        JSON.stringify({ status: 'bloqueada', motivo: motivo.slice(0, 100) }),
      )
      $app.save(ev)
    } catch (_) {}
    return e.json(200, { ok: true, status: 'bloqueada' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/excecoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var statusF = String(e.request.url.query().get('status') || 'aberta').trim()
    var filtro = 'status = {:s}'
    var params = { s: statusF }
    if (statusF === 'todas') {
      filtro = "status != ''"
      params = {}
    }
    var exs = []
    try {
      exs = $app.findRecordsByFilter('excecoes', filtro, '-aberta_em', 200, 0, params)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar exceções.' })
    }
    var itens = []
    for (var i = 0; i < exs.length; i++) {
      var ex = exs[i]
      var clienteNome = ''
      try {
        clienteNome = String(
          $app.findRecordById('empresas', String(ex.get('cliente') || '')).get('nome') || '',
        )
      } catch (_) {}
      itens.push({
        id: ex.id,
        tipo: String(ex.get('tipo') || ''),
        cliente: String(ex.get('cliente') || ''),
        cliente_nome: clienteNome,
        obrigacao: String(ex.get('obrigacao') || ''),
        descricao: String(ex.get('descricao') || ''),
        aberta_em: String(ex.get('aberta_em') || ''),
        escalada_coordenacao: ex.get('escalada_coordenacao') === true,
        status: String(ex.get('status') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

cronAdd('obrigacoes_motor', '5 9 * * *', () => {
  var FERIADOS_FIXOS = [
    '01-01',
    '04-21',
    '05-01',
    '06-11',
    '09-07',
    '10-12',
    '11-02',
    '11-15',
    '11-20',
    '12-25',
  ]
  var ehDiaUtil = function (d) {
    var dow = d.getUTCDay()
    if (dow === 0 || dow === 6) return false
    var mmdd = ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2)
    return FERIADOS_FIXOS.indexOf(mmdd) < 0
  }
  var ajustarDiaUtil = function (d) {
    var guard = 0
    while (!ehDiaUtil(d) && guard < 30) {
      d.setUTCDate(d.getUTCDate() - 1)
      guard++
    }
    return d
  }
  var dataISO = function (d) {
    return d.toISOString().slice(0, 10) + ' 00:00:00.000Z'
  }
  var datasDoCiclo = function (ficha, servico, hoje) {
    var datas = []
    var periodicidade = String(ficha.get('periodicidade_projecao') || '')
    var diasRef = String(ficha.get('dias_referencia') || '').toLowerCase()
    if (servico === 'contas_a_pagar' && periodicidade) {
      if (periodicidade === 'semanal') {
        var alvoDow = -1
        if (diasRef.indexOf('segunda') >= 0) alvoDow = 1
        else if (diasRef.indexOf('terça') >= 0 || diasRef.indexOf('terca') >= 0) alvoDow = 2
        else if (diasRef.indexOf('quarta') >= 0) alvoDow = 3
        else if (diasRef.indexOf('quinta') >= 0) alvoDow = 4
        else if (diasRef.indexOf('sexta') >= 0) alvoDow = 5
        if (alvoDow >= 0) {
          var d1 = new Date(hoje.getTime())
          while (d1.getUTCDay() !== alvoDow || d1.getTime() <= hoje.getTime()) {
            d1.setUTCDate(d1.getUTCDate() + 1)
          }
          var d2 = new Date(d1.getTime())
          d2.setUTCDate(d2.getUTCDate() + 7)
          datas.push(ajustarDiaUtil(new Date(d1.getTime())))
          datas.push(ajustarDiaUtil(new Date(d2.getTime())))
        }
      } else {
        var nums = diasRef.match(/\d{1,2}/g) || []
        var passou = []
        for (var i = 0; i < nums.length; i++) {
          var dia = parseInt(nums[i], 10)
          if (dia >= 1 && dia <= 31) passou.push(dia)
        }
        passou.sort(function (a, b) {
          return a - b
        })
        var mesAtual = hoje.getUTCMonth()
        var anoAtual = hoje.getUTCFullYear()
        var candidatos = []
        for (var m = 0; m < 2; m++) {
          var mes = mesAtual + m
          var ano = anoAtual
          if (mes > 11) {
            mes -= 12
            ano++
          }
          for (var j = 0; j < passou.length; j++) {
            var dd = new Date(Date.UTC(ano, mes, passou[j]))
            if (dd.getTime() > hoje.getTime()) candidatos.push(dd)
          }
        }
        candidatos.sort(function (a, b) {
          return a.getTime() - b.getTime()
        })
        for (var k = 0; k < candidatos.length && k < 2; k++) {
          datas.push(ajustarDiaUtil(new Date(candidatos[k].getTime())))
        }
      }
    }
    if (servico === 'faturamento') {
      var diaEm = String(ficha.get('dia_emissao') || '').toLowerCase()
      var numsF = diaEm.match(/\d{1,2}/g) || []
      var diasF = []
      for (var fi = 0; fi < numsF.length; fi++) {
        var df = parseInt(numsF[fi], 10)
        if (df >= 1 && df <= 31) diasF.push(df)
      }
      diasF.sort(function (a, b) {
        return a - b
      })
      var candF = []
      for (var fm = 0; fm < 2; fm++) {
        var mesF = hoje.getUTCMonth() + fm
        var anoF = hoje.getUTCFullYear()
        if (mesF > 11) {
          mesF -= 12
          anoF++
        }
        for (var fj = 0; fj < diasF.length; fj++) {
          var ddf = new Date(Date.UTC(anoF, mesF, diasF[fj]))
          if (ddf.getTime() > hoje.getTime()) candF.push(ddf)
        }
      }
      candF.sort(function (a, b) {
        return a.getTime() - b.getTime()
      })
      for (var fk = 0; fk < candF.length && fk < 2; fk++) {
        datas.push(ajustarDiaUtil(new Date(candF[fk].getTime())))
      }
    }
    if (servico === 'conciliacao') {
      var freq = String(ficha.get('frequencia_conciliacao') || '')
      if (freq === 'diaria') {
        var dC1 = new Date(hoje.getTime())
        dC1.setUTCDate(dC1.getUTCDate() + 1)
        var dC2 = new Date(hoje.getTime())
        dC2.setUTCDate(dC2.getUTCDate() + 2)
        datas.push(ajustarDiaUtil(dC1), ajustarDiaUtil(dC2))
      } else if (freq === 'semanal') {
        var dS1 = new Date(hoje.getTime())
        dS1.setUTCDate(dS1.getUTCDate() + 7)
        var dS2 = new Date(hoje.getTime())
        dS2.setUTCDate(dS2.getUTCDate() + 14)
        datas.push(ajustarDiaUtil(dS1), ajustarDiaUtil(dS2))
      }
    }
    if (servico === 'fechamento') {
      var prazoE = String(ficha.get('prazo_entrega') || '').toLowerCase()
      var numsP = prazoE.match(/\d{1,2}/g) || []
      if (numsP.length > 0) {
        var diaP = parseInt(numsP[0], 10)
        var mesP = hoje.getUTCMonth() + 1
        var anoP = hoje.getUTCFullYear()
        if (mesP > 11) {
          mesP -= 12
          anoP++
        }
        datas.push(ajustarDiaUtil(new Date(Date.UTC(anoP, mesP, diaP))))
      }
    }
    return datas
  }
  var tiposPorServico = function (servico) {
    if (servico === 'contas_a_pagar')
      return ['coleta_canal', 'lancamento', 'projecao', 'envio_autorizacao', 'cadastro_banco']
    if (servico === 'faturamento') return ['relatorio_faturamento', 'emissao_nota', 'entrega_nota']
    if (servico === 'conciliacao') return ['conciliacao']
    if (servico === 'fechamento') return ['fechamento', 'entrega_contabilidade']
    return []
  }
  var offsetTipo = function (tipo) {
    if (tipo === 'coleta_canal') return -3
    if (tipo === 'lancamento') return -2
    if (tipo === 'projecao') return -1
    if (tipo === 'envio_autorizacao') return -1
    if (tipo === 'cadastro_banco') return 0
    if (tipo === 'relatorio_faturamento') return -3
    if (tipo === 'emissao_nota') return 0
    if (tipo === 'entrega_nota') return 1
    if (tipo === 'conciliacao') return 0
    if (tipo === 'fechamento') return -5
    if (tipo === 'entrega_contabilidade') return 0
    return 0
  }
  var gerarMotor = function () {
    var geradas = 0
    var ignoradas = 0
    var agoraISO = new Date().toISOString()
    var hoje = new Date()
    var fichas = $app.findRecordsByFilter(
      'fichas_operacionais',
      "status_operacional = 'ativo'",
      '',
      200,
      0,
    )
    for (var f = 0; f < fichas.length; f++) {
      var ficha = fichas[f]
      var clienteId = String(ficha.get('empresa') || '')
      var titular = String(ficha.get('responsavel_principal') || '')
      var reserva = String(ficha.get('responsavel_reserva') || '')
      var substituicao = false
      var responsavel = titular
      if (titular) {
        try {
          var u = $app.findRecordById('_pb_users_auth_', titular)
          if (u.get('active') === false) {
            responsavel = reserva
            substituicao = true
          }
        } catch (_) {
          responsavel = reserva
          substituicao = true
        }
      } else if (reserva) {
        responsavel = reserva
        substituicao = true
      }
      if (!responsavel) continue
      var servicos = String(ficha.get('servicos_contratados') || '').split(',')
      for (var s = 0; s < servicos.length; s++) {
        var servico = servicos[s].trim()
        if (!servico) continue
        var tipos = tiposPorServico(servico)
        if (tipos.length === 0) continue
        var datas = datasDoCiclo(ficha, servico, hoje)
        for (var d = 0; d < datas.length; d++) {
          var prevista = datas[d]
          for (var t = 0; t < tipos.length; t++) {
            var tipo = tipos[t]
            var off = offsetTipo(tipo)
            var dt = new Date(prevista.getTime())
            dt.setUTCDate(dt.getUTCDate() + off)
            if (!ehDiaUtil(dt)) dt = ajustarDiaUtil(dt)
            var prazo = new Date(dt.getTime())
            prazo.setUTCHours(21, 0, 0, 0)
            var cicloChave = clienteId + '|' + tipo + '|' + dt.toISOString().slice(0, 10)
            var existentes = $app.findRecordsByFilter(
              'obrigacoes',
              'ciclo_chave = {:c}',
              '',
              1,
              0,
              { c: cicloChave },
            )
            if (existentes.length > 0) {
              ignoradas++
              continue
            }
            var col = $app.findCollectionByNameOrId('obrigacoes')
            var rec = new Record(col)
            rec.set('tipo', tipo)
            rec.set('cliente', clienteId)
            rec.set('ficha', ficha.id)
            rec.set('responsavel', responsavel)
            rec.set('substituicao_aplicada', substituicao)
            rec.set('data_prevista', dataISO(dt))
            rec.set('prazo_limite', prazo.toISOString().replace('T', ' '))
            rec.set('status', 'prevista')
            rec.set('gerada_em', agoraISO)
            rec.set('ciclo_chave', cicloChave)
            try {
              $app.save(rec)
              geradas++
            } catch (errS) {
              ignoradas++
            }
          }
        }
      }
    }
    return { geradas: geradas, ignoradas: ignoradas }
  }
  var avaliarAtrasos = function () {
    var marcadas = 0
    var excecoesNovas = 0
    var agora = Date.now()
    var abertas = $app.findRecordsByFilter(
      'obrigacoes',
      "status = 'prevista' || status = 'em_execucao'",
      '',
      500,
      0,
    )
    for (var i = 0; i < abertas.length; i++) {
      var ob = abertas[i]
      var prazo = String(ob.get('prazo_limite') || '')
      if (!prazo || prazo.indexOf('0001-01-01') === 0) continue
      var msP = Date.parse(prazo.replace(' ', 'T'))
      if (isNaN(msP) || msP >= agora) continue
      ob.set('status', 'atrasada')
      $app.save(ob)
      marcadas++
      var jaExiste = $app.findRecordsByFilter(
        'excecoes',
        "obrigacao = {:o} && tipo = 'obrigacao_atrasada' && status = 'aberta'",
        '',
        1,
        0,
        { o: ob.id },
      )
      if (jaExiste.length === 0) {
        var col = $app.findCollectionByNameOrId('excecoes')
        var ex = new Record(col)
        ex.set('tipo', 'obrigacao_atrasada')
        ex.set('cliente', String(ob.get('cliente') || ''))
        ex.set('obrigacao', ob.id)
        ex.set(
          'descricao',
          'Obrigação ' +
            String(ob.get('tipo') || '') +
            ' venceu em ' +
            prazo.slice(0, 10) +
            ' sem baixa.',
        )
        ex.set('aberta_em', new Date().toISOString())
        ex.set('destinatario_analista', String(ob.get('responsavel') || ''))
        ex.set('escalada_coordenacao', false)
        ex.set('status', 'aberta')
        try {
          $app.save(ex)
          excecoesNovas++
        } catch (_) {}
      }
    }
    return { marcadas: marcadas, excecoes: excecoesNovas }
  }
  var r1 = gerarMotor()
  var r2 = avaliarAtrasos()
  $app
    .logger()
    .info('T312 motor executado', 'geradas', String(r1.geradas), 'atrasadas', String(r2.marcadas))
})
