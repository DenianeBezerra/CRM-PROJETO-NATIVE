// T3.14 — SPEC-3-014: Exceções E1–E9 com gatilho por marcação de etapa (sem integração externa).
// Decisão da CEO (13/09): integração com Omie/banco fica para depois — os gatilhos nascem
// da marcação de etapa na obrigação (POST /obrigacoes/{id}/etapa) e da avaliação no cron.
//
// Rotas:
//   POST /backend/v1/obrigacoes/{id}/etapa   — marca etapa (auth; evidencia opcional)
//   POST /backend/v1/excecoes/avaliar        — executa avaliação E1–E9 (admin; também no cron)
//   GET  /backend/v1/excecoes                — já existe em motor_rotinas.js (não duplicar)
//
// Mapeamento (cap. 5 do doc da CEO):
//   E1 autorizacao_pendente: envio_autorizacao com etapa=enviada e prazo_resposta_horas da ficha vencido
//      (base: etapa_em). Reincidente (reincidencia >= 1) → escalada_coordenacao = true.
//   E2 aprovacao_bancaria_pendente: cadastro_banco com etapa=aguardando_aprovacao e data_prevista vencida.
//   E3 pagamento_nao_conciliado: conciliacao com etapa=executada (pagamento executado) e
//      data_prevista vencida sem etapa=conciliada.
//   E4 relatorio_sem_aceite: relatorio_faturamento com etapa=enviada e véspera da emissão
//      (dia_emissao da ficha) atingida sem aceite.
//   E5 nota_nao_emitida: emissao_nota com data_prevista atingida e etapa != emitida.
//   E6 nota_nao_entregue: entrega_nota com etapa=emitida e data_prevista vencida sem entrega.
//   E7 recebimento_atrasado: SEM fonte automática (contas a receber não existe no CRM) —
//      gatilho manual por marcação de etapa na obrigação (estrutura pronta p/ conector).
//   E8 documento_faltante: fechamento com etapa=executada e marcação manual de documento
//      faltante (via rota de etapa com motivo na evidencia).
//   E9 entrega_contabilidade_pendente: entrega_contabilidade com data_prevista vencida sem baixa.
//
// Dedup: exceção aberta por (cliente, tipo, obrigacao) não duplica.
// Resolução: baixa da obrigação resolve TODAS as exceções abertas vinculadas (já existia p/ E10).
// AP-0200 TOTAL: TODOS os helpers vivem DENTRO de cada escopo.

routerAdd(
  'POST',
  '/backend/v1/obrigacoes/{id}/etapa',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ob
    try {
      ob = $app.findRecordById('obrigacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Obrigação não encontrada.' })
    }
    var body = e.requestInfo().body || {}
    var etapa = String(body.etapa || '').trim()
    var validas = [
      'aguardando',
      'enviada',
      'executada',
      'conciliada',
      'emitida',
      'entregue',
      'aguardando_aceite',
      'aguardando_aprovacao',
    ]
    if (validas.indexOf(etapa) < 0)
      return e.json(400, { error: 'Etapa inválida. Válidas: ' + validas.join(', ') })
    var status = String(ob.get('status') || '')
    if (status === 'concluida')
      return e.json(400, { error: 'Obrigação já concluída — não aceita etapa.' })
    var etapaAnterior = String(ob.get('etapa') || '')
    ob.set('etapa', etapa)
    ob.set('etapa_em', new Date().toISOString().replace('T', ' '))
    var ev = String(body.evidencia || '').trim()
    if (ev) ob.set('evidencia', ev.slice(0, 2000))
    try {
      $app.save(ob)
    } catch (err) {
      return e.json(400, { error: 'Falha ao marcar etapa: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var evRec = new Record(audit)
      evRec.set('entidade', 'obrigacoes')
      evRec.set('registro_id', ob.id)
      evRec.set('acao', 'etapa_marcada')
      evRec.set('ator_id', actor.id)
      evRec.set('ocorrido_em', new Date().toISOString())
      evRec.set('estado_anterior', etapaAnterior)
      evRec.set('estado_posterior', etapa)
      $app.save(evRec)
    } catch (errA) {
      $app.logger().error('T314 auditoria etapa falhou', 'erro', String(errA))
    }
    return e.json(200, { ok: true, etapa: etapa, etapa_em: String(ob.get('etapa_em') || '') })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/excecoes/avaliar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Avaliação de exceções é exclusiva de administradores.' })
    }
    console.log('T314 avaliar chamado')
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
    var parseData = function (s) {
      if (!s || String(s).indexOf('0001-01-01') === 0) return null
      var ms = Date.parse(String(s).replace(' ', 'T'))
      return isNaN(ms) ? null : ms
    }
    var fichaCache = {}
    var fichaDe = function (id) {
      if (fichaCache[id]) return fichaCache[id]
      var f = null
      try {
        f = $app.findRecordById('fichas_operacionais', id)
      } catch (_) {}
      fichaCache[id] = f
      return f
    }
    var criarExcecao = function (tipo, ob, descricao, prazoAlertaMs) {
      var jaExiste = $app.findRecordsByFilter(
        'excecoes',
        "cliente = {:c} && tipo = {:t} && obrigacao = {:o} && status = 'aberta'",
        '',
        1,
        0,
        { c: String(ob.get('cliente') || ''), t: tipo, o: ob.id },
      )
      if (jaExiste.length > 0) return 0
      var col = $app.findCollectionByNameOrId('excecoes')
      var ex = new Record(col)
      ex.set('tipo', tipo)
      ex.set('cliente', String(ob.get('cliente') || ''))
      ex.set('obrigacao', ob.id)
      ex.set('descricao', descricao)
      ex.set('aberta_em', new Date().toISOString())
      ex.set('destinatario_analista', String(ob.get('responsavel') || ''))
      ex.set('escalada_coordenacao', false)
      ex.set('reincidencia', 0)
      ex.set('status', 'aberta')
      if (prazoAlertaMs) {
        var d = new Date(prazoAlertaMs)
        ex.set('prazo_alerta', d.toISOString().replace('T', ' '))
      }
      try {
        $app.save(ex)
      } catch (errSave) {
        console.log('T314 erro ao salvar excecao: ' + String(errSave))
        return 0
      }
      try {
        var audit = $app.findCollectionByNameOrId('auditoria')
        var evRec = new Record(audit)
        evRec.set('entidade', 'excecoes')
        evRec.set('registro_id', ex.id)
        evRec.set('acao', 'excecao_gerada')
        evRec.set('ator_id', actor.id)
        evRec.set('ocorrido_em', new Date().toISOString())
        evRec.set('estado_anterior', '')
        evRec.set('estado_posterior', tipo + '|' + ob.id)
        $app.save(evRec)
      } catch (_) {}
      return 1
    }
    var avaliar = function () {
      var criadas = 0
      var agora = Date.now()
      var abertas = $app.findRecordsByFilter(
        'obrigacoes',
        "status = 'prevista' || status = 'em_execucao' || status = 'atrasada'",
        '',
        500,
        0,
      )
      for (var i = 0; i < abertas.length; i++) {
        var ob = abertas[i]
        var tipo = String(ob.get('tipo') || '')
        var etapa = String(ob.get('etapa') || '')
        var etapaEm = parseData(String(ob.get('etapa_em') || ''))
        var prevista = parseData(String(ob.get('data_prevista') || ''))
        var prazo = parseData(String(ob.get('prazo_limite') || ''))
        var ficha = fichaDe(String(ob.get('ficha') || ''))
        // E1 — autorização de projeção pendente
        if (tipo === 'envio_autorizacao' && etapa === 'enviada' && etapaEm) {
          var horas = 24
          if (ficha) {
            var h = ficha.get('prazo_resposta_horas')
            if (h && Number(h) > 0) horas = Number(h)
          }
          var limiteResp = etapaEm + horas * 3600000
          if (agora >= limiteResp) {
            // reincidente: já houve exceção E1 resolvida para esta obrigação?
            var anteriores = $app.findRecordsByFilter(
              'excecoes',
              "obrigacao = {:o} && tipo = 'autorizacao_pendente'",
              '',
              10,
              0,
              { o: ob.id },
            )
            var reincidente = anteriores.length > 0
            var criou = criarExcecao(
              'autorizacao_pendente',
              ob,
              'Autorização de projeção pendente — enviada em ' +
                String(ob.get('etapa_em') || '').slice(0, 10) +
                ' sem resposta em ' +
                horas +
                'h.',
              limiteResp,
            )
            if (criou && reincidente) {
              // marca escalada na exceção recém-criada (rebuscar pela obrigação)
              var abertas1 = $app.findRecordsByFilter(
                'excecoes',
                "obrigacao = {:o} && tipo = 'autorizacao_pendente' && status = 'aberta'",
                '',
                1,
                0,
                { o: ob.id },
              )
              if (abertas1.length > 0) {
                abertas1[0].set('escalada_coordenacao', true)
                abertas1[0].set('reincidencia', anteriores.length)
                $app.save(abertas1[0])
              }
            }
            criadas += criou
          }
        }
        // E2 — aprovação bancária pendente
        if (
          tipo === 'cadastro_banco' &&
          etapa === 'aguardando_aprovacao' &&
          prazo &&
          agora >= prazo
        ) {
          criadas += criarExcecao(
            'aprovacao_bancaria_pendente',
            ob,
            'Aprovação bancária pendente — cadastro aguardando aprovação com prazo vencido em ' +
              String(ob.get('prazo_limite') || '').slice(0, 10) +
              '.',
            prazo,
          )
        }
        // E3 — pagamento não conciliado
        if (tipo === 'conciliacao' && etapa === 'executada' && prazo && agora >= prazo) {
          criadas += criarExcecao(
            'pagamento_nao_conciliado',
            ob,
            'Pagamento executado sem conciliação no prazo (' +
              String(ob.get('prazo_limite') || '').slice(0, 10) +
              ').',
            prazo,
          )
        }
        // E4 — relatório de faturamento sem aceite (véspera da emissão)
        if (tipo === 'relatorio_faturamento' && etapa === 'enviada' && ficha) {
          var diaEm = String(ficha.get('dia_emissao') || '')
          var nums = diaEm.match(/\d{1,2}/g) || []
          if (nums.length > 0) {
            var diaAlvo = parseInt(nums[0], 10)
            var hoje = new Date()
            var vespera = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), diaAlvo))
            vespera.setUTCDate(vespera.getUTCDate() - 1)
            if (agora >= vespera.getTime()) {
              criadas += criarExcecao(
                'relatorio_sem_aceite',
                ob,
                'Relatório de faturamento enviado sem aceite — véspera da emissão (' +
                  String(diaAlvo).padStart(2, '0') +
                  ').',
                vespera.getTime(),
              )
            }
          }
        }
        // E5 — nota não emitida
        if (tipo === 'emissao_nota' && etapa !== 'emitida' && prevista && agora >= prevista) {
          criadas += criarExcecao(
            'nota_nao_emitida',
            ob,
            'Nota não emitida — data de emissão atingida (' +
              String(ob.get('data_prevista') || '').slice(0, 10) +
              ') com emissão pendente.',
            prevista,
          )
        }
        // E6 — nota emitida e não entregue
        if (tipo === 'entrega_nota' && etapa === 'emitida' && prazo && agora >= prazo) {
          criadas += criarExcecao(
            'nota_nao_entregue',
            ob,
            'Nota emitida e não entregue — prazo de entrega vencido em ' +
              String(ob.get('prazo_limite') || '').slice(0, 10) +
              '.',
            prazo,
          )
        }
        // E8 — documento faltante no fechamento (marcação manual via etapa + evidencia)
        if (tipo === 'fechamento' && etapa === 'aguardando' && prazo && agora >= prazo) {
          criadas += criarExcecao(
            'documento_faltante',
            ob,
            'Fechamento no prazo sem documentos — possível documento faltante (' +
              String(ob.get('prazo_limite') || '').slice(0, 10) +
              ').',
            prazo,
          )
        }
        // E9 — entrega à contabilidade pendente
        if (tipo === 'entrega_contabilidade' && prazo && agora >= prazo) {
          criadas += criarExcecao(
            'entrega_contabilidade_pendente',
            ob,
            'Entrega à contabilidade pendente — prazo vencido em ' +
              String(ob.get('prazo_limite') || '').slice(0, 10) +
              '.',
            prazo,
          )
        }
        // E7 — recebimento em atraso: sem fonte automática; gatilho manual via etapa
        // (estrutura pronta para o conector OMIE — não gera sozinho nesta leva).
      }
      return criadas
    }
    var criadas = avaliar()
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var evRec = new Record(audit)
      evRec.set('entidade', 'excecoes')
      evRec.set('registro_id', 'avaliacao')
      evRec.set('acao', 'motor_executado')
      evRec.set('ator_id', actor.id)
      evRec.set('ocorrido_em', new Date().toISOString())
      evRec.set('estado_anterior', '')
      evRec.set('estado_posterior', JSON.stringify({ excecoes_criadas: criadas }))
      $app.save(evRec)
    } catch (_) {}
    return e.json(200, { ok: true, excecoes_criadas: criadas })
  },
  $apis.requireAuth(),
)

// Cron: avalia E1–E9 logo após o motor (06:05 BRT = 09:05 UTC) + 5 min de folga.
cronAdd('excecoes_e1_e9', '10 9 * * *', () => {
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
  var parseData = function (s) {
    if (!s || String(s).indexOf('0001-01-01') === 0) return null
    var ms = Date.parse(String(s).replace(' ', 'T'))
    return isNaN(ms) ? null : ms
  }
  var fichaCache = {}
  var fichaDe = function (id) {
    if (fichaCache[id]) return fichaCache[id]
    var f = null
    try {
      f = $app.findRecordById('fichas_operacionais', id)
    } catch (_) {}
    fichaCache[id] = f
    return f
  }
  var criarExcecao = function (tipo, ob, descricao, prazoAlertaMs) {
    var jaExiste = $app.findRecordsByFilter(
      'excecoes',
      "cliente = {:c} && tipo = {:t} && obrigacao = {:o} && status = 'aberta'",
      '',
      1,
      0,
      { c: String(ob.get('cliente') || ''), t: tipo, o: ob.id },
    )
    if (jaExiste.length > 0) return 0
    var col = $app.findCollectionByNameOrId('excecoes')
    var ex = new Record(col)
    ex.set('tipo', tipo)
    ex.set('cliente', String(ob.get('cliente') || ''))
    ex.set('obrigacao', ob.id)
    ex.set('descricao', descricao)
    ex.set('aberta_em', new Date().toISOString())
    ex.set('destinatario_analista', String(ob.get('responsavel') || ''))
    ex.set('escalada_coordenacao', false)
    ex.set('reincidencia', 0)
    ex.set('status', 'aberta')
    if (prazoAlertaMs) {
      var d = new Date(prazoAlertaMs)
      ex.set('prazo_alerta', d.toISOString().replace('T', ' '))
    }
    try {
      $app.save(ex)
    } catch (_) {
      return 0
    }
    return 1
  }
  var criadas = 0
  var agora = Date.now()
  var abertas = $app.findRecordsByFilter(
    'obrigacoes',
    "status = 'prevista' || status = 'em_execucao' || status = 'atrasada'",
    '',
    500,
    0,
  )
  for (var i = 0; i < abertas.length; i++) {
    var ob = abertas[i]
    var tipo = String(ob.get('tipo') || '')
    var etapa = String(ob.get('etapa') || '')
    var etapaEm = parseData(String(ob.get('etapa_em') || ''))
    var prevista = parseData(String(ob.get('data_prevista') || ''))
    var prazo = parseData(String(ob.get('prazo_limite') || ''))
    var ficha = fichaDe(String(ob.get('ficha') || ''))
    if (tipo === 'envio_autorizacao' && etapa === 'enviada' && etapaEm) {
      var horas = 24
      if (ficha) {
        var h = ficha.get('prazo_resposta_horas')
        if (h && Number(h) > 0) horas = Number(h)
      }
      var limiteResp = etapaEm + horas * 3600000
      if (agora >= limiteResp) {
        var anteriores = $app.findRecordsByFilter(
          'excecoes',
          "obrigacao = {:o} && tipo = 'autorizacao_pendente'",
          '',
          10,
          0,
          { o: ob.id },
        )
        var reincidente = anteriores.length > 0
        var criou = criarExcecao(
          'autorizacao_pendente',
          ob,
          'Autorização de projeção pendente — enviada em ' +
            String(ob.get('etapa_em') || '').slice(0, 10) +
            ' sem resposta em ' +
            horas +
            'h.',
          limiteResp,
        )
        if (criou && reincidente) {
          var abertas1 = $app.findRecordsByFilter(
            'excecoes',
            "obrigacao = {:o} && tipo = 'autorizacao_pendente' && status = 'aberta'",
            '',
            1,
            0,
            { o: ob.id },
          )
          if (abertas1.length > 0) {
            abertas1[0].set('escalada_coordenacao', true)
            abertas1[0].set('reincidencia', anteriores.length)
            $app.save(abertas1[0])
          }
        }
        criadas += criou
      }
    }
    if (tipo === 'cadastro_banco' && etapa === 'aguardando_aprovacao' && prazo && agora >= prazo) {
      criadas += criarExcecao(
        'aprovacao_bancaria_pendente',
        ob,
        'Aprovação bancária pendente — cadastro aguardando aprovação com prazo vencido em ' +
          String(ob.get('prazo_limite') || '').slice(0, 10) +
          '.',
        prazo,
      )
    }
    if (tipo === 'conciliacao' && etapa === 'executada' && prazo && agora >= prazo) {
      criadas += criarExcecao(
        'pagamento_nao_conciliado',
        ob,
        'Pagamento executado sem conciliação no prazo (' +
          String(ob.get('prazo_limite') || '').slice(0, 10) +
          ').',
        prazo,
      )
    }
    if (tipo === 'relatorio_faturamento' && etapa === 'enviada' && ficha) {
      var diaEm = String(ficha.get('dia_emissao') || '')
      var nums = diaEm.match(/\d{1,2}/g) || []
      if (nums.length > 0) {
        var diaAlvo = parseInt(nums[0], 10)
        var hoje = new Date()
        var vespera = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), diaAlvo))
        vespera.setUTCDate(vespera.getUTCDate() - 1)
        if (agora >= vespera.getTime()) {
          criadas += criarExcecao(
            'relatorio_sem_aceite',
            ob,
            'Relatório de faturamento enviado sem aceite — véspera da emissão (' +
              String(diaAlvo).padStart(2, '0') +
              ').',
            vespera.getTime(),
          )
        }
      }
    }
    if (tipo === 'emissao_nota' && etapa !== 'emitida' && prevista && agora >= prevista) {
      criadas += criarExcecao(
        'nota_nao_emitida',
        ob,
        'Nota não emitida — data de emissão atingida (' +
          String(ob.get('data_prevista') || '').slice(0, 10) +
          ') com emissão pendente.',
        prevista,
      )
    }
    if (tipo === 'entrega_nota' && etapa === 'emitida' && prazo && agora >= prazo) {
      criadas += criarExcecao(
        'nota_nao_entregue',
        ob,
        'Nota emitida e não entregue — prazo de entrega vencido em ' +
          String(ob.get('prazo_limite') || '').slice(0, 10) +
          '.',
        prazo,
      )
    }
    if (tipo === 'fechamento' && etapa === 'aguardando' && prazo && agora >= prazo) {
      criadas += criarExcecao(
        'documento_faltante',
        ob,
        'Fechamento no prazo sem documentos — possível documento faltante (' +
          String(ob.get('prazo_limite') || '').slice(0, 10) +
          ').',
        prazo,
      )
    }
    if (tipo === 'entrega_contabilidade' && prazo && agora >= prazo) {
      criadas += criarExcecao(
        'entrega_contabilidade_pendente',
        ob,
        'Entrega à contabilidade pendente — prazo vencido em ' +
          String(ob.get('prazo_limite') || '').slice(0, 10) +
          '.',
        prazo,
      )
    }
  }
  // Fail-safe (divergência exceção × atraso, CEO 16/09): exceção aberta
  // vinculada a obrigação CONCLUÍDA é órfã — a resolução por baixa só roda na
  // rota /baixa, e conclusão direta no banco deixa a exceção aberta para
  // sempre, divergindo do C-01 (atraso por data). O cron resolve órfãs.
  try {
    var todasOrfas = $app.findRecordsByFilter('excecoes', "status = 'aberta'", '', 500, 0)
    for (var o = 0; o < todasOrfas.length; o++) {
      var exO = todasOrfas[o]
      var obId = String(exO.get('obrigacao') || '')
      if (!obId) continue
      try {
        var obO = $app.findRecordById('obrigacoes', obId)
        if (String(obO.get('status') || '') === 'concluida') {
          exO.set('status', 'resolvida')
          exO.set('resolvida_em', new Date().toISOString())
          exO.set(
            'motivo_resolucao',
            'Fail-safe: obrigação vinculada já concluída — exceção órfã resolvida pelo cron.',
          )
          $app.save(exO)
        }
      } catch (_) {}
    }
  } catch (errOrfas) {
    $app.logger().error('T314 fail-safe orfas falhou', String(errOrfas))
  }
  $app.logger().info('T314 excecoes E1-E9 avaliadas', 'criadas', String(criadas))
})
