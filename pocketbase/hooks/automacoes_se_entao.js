// T3.06 — Automações Se/Então (doc Onda 3 §12): cron diário + execução manual.
// Regras geradas (limiares da SPEC-3-005):
//   follow_up_proposta      — proposta emitida há >= 3 dias sem decisão
//   follow_up_sem_resposta  — proposta emitida há >= 7 dias sem decisão
//   alerta_sem_proxima_acao — oportunidade ativa sem próxima ação futura
//   alerta_parada           — permanência aberta acima do limite configurado
// GARANTIA (herdada do T2.25): NUNCA altera resultado comercial — só insere em
// automacoes_execucoes (append-only, idempotente por regra+negócio+dia UNIQUE).
// Cron: 08:05 BRT = 11:05 UTC (após o cron de propostas vencidas 11:00 UTC).
// Runtime goja: callbacks NÃO enxergam escopo superior (AP-0200) — TODA a lógica
// inline em cada callback; datas PB " " → "T"; 0001-01-01 = ausente.
cronAdd('automacoes_diarias', '5 11 * * *', () => {
  var agora = Date.now()
  var diaReferencia = new Date().toISOString().slice(0, 10)
  var DIA_MS = 86400000
  var LIMITE_FOLLOW_UP_DIAS = 3
  var LIMITE_SEM_RESPOSTA_DIAS = 7

  var col
  try {
    col = $app.findCollectionByNameOrId('automacoes_execucoes')
  } catch (err) {
    $app.logger().error('T306 cron: coleção indisponível', 'error', String(err))
    return
  }

  // limite de parada reusa a config existente (padrão 10 dias)
  var limiteParadaDias = 10
  try {
    var cfgs = $app.findRecordsByFilter(
      'configuracoes_operacionais',
      "chave = 'limite_oportunidade_parada_dias'",
      '',
      1,
      0,
    )
    if (cfgs.length > 0) {
      var v = Number(cfgs[0].get('valor_numero'))
      if (Number.isFinite(v) && v >= 0) limiteParadaDias = v
    }
  } catch (_) {}

  var perms = []
  try {
    perms = $app.findRecordsByFilter('permanencias_negocio', '', '-created', 20000, 0)
  } catch (_) {
    perms = []
  }
  var abertaPorNegocio = {}
  for (var p = 0; p < perms.length; p++) {
    var saiu = String(perms[p].get('saiu_em') || '')
    var fechada = saiu !== '' && saiu.indexOf('0001-01-01') !== 0
    if (fechada) continue
    var nid = String(perms[p].get('negocio') || '')
    if (!abertaPorNegocio[nid]) {
      abertaPorNegocio[nid] = String(perms[p].get('entrou_em') || '')
    }
  }

  var FINAL = ['fechado_ganho', 'fechado_perdido']
  var negocios = []
  try {
    negocios = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
  } catch (err) {
    $app.logger().error('T306 cron: falha ao consultar oportunidades', 'error', String(err))
    return
  }

  var propostas = []
  try {
    propostas = $app.findRecordsByFilter('propostas', "status = 'emitida'", '-created', 20000, 0)
  } catch (_) {
    propostas = []
  }
  var propostaPorNegocio = {}
  for (var pr = 0; pr < propostas.length; pr++) {
    var pid = String(propostas[pr].get('negocio') || '')
    if (!propostaPorNegocio[pid]) propostaPorNegocio[pid] = propostas[pr]
  }

  var inserir = function (regra, negocio, responsavel, detalhe) {
    try {
      var dup = $app.findRecordsByFilter(
        'automacoes_execucoes',
        'regra = {:r} && negocio = {:n} && dia_referencia = {:d}',
        '',
        1,
        0,
        { r: regra, n: negocio.id, d: diaReferencia },
      )
      if (dup.length > 0) return false
    } catch (_) {}
    var rec = new Record(col)
    rec.set('regra', regra)
    rec.set('negocio', negocio.id)
    if (responsavel) rec.set('responsavel', responsavel)
    rec.set('detalhe', JSON.stringify(detalhe))
    rec.set('dia_referencia', diaReferencia)
    try {
      $app.save(rec)
      return true
    } catch (err) {
      $app.logger().warn('T306 registro duplicado ignorado', 'error', String(err))
      return false
    }
  }

  var cont = {
    follow_up_proposta: 0,
    follow_up_sem_resposta: 0,
    alerta_sem_proxima_acao: 0,
    alerta_parada: 0,
  }

  for (var i = 0; i < negocios.length; i++) {
    var n = negocios[i]
    if (n.get('arquivado') === true) continue
    var estagio = String(n.get('estagio') || '')
    if (FINAL.indexOf(estagio) >= 0) continue
    var resp = String(n.get('responsavel') || '')

    var prop = propostaPorNegocio[n.id]
    if (prop) {
      var emitidaEm = String(prop.get('emitida_em') || prop.get('created') || '')
      if (emitidaEm && emitidaEm.indexOf('0001-01-01') !== 0) {
        var msE = Date.parse(emitidaEm.replace(' ', 'T'))
        if (!isNaN(msE)) {
          var dias = Math.floor((agora - msE) / DIA_MS)
          if (dias >= LIMITE_SEM_RESPOSTA_DIAS) {
            if (
              inserir('follow_up_sem_resposta', n, resp, {
                dias_sem_resposta: dias,
                versao_proposta: Number(prop.get('versao')) || 0,
                valor: Number(prop.get('valor')) || 0,
              })
            )
              cont.follow_up_sem_resposta++
          } else if (dias >= LIMITE_FOLLOW_UP_DIAS) {
            if (
              inserir('follow_up_proposta', n, resp, {
                dias_desde_envio: dias,
                versao_proposta: Number(prop.get('versao')) || 0,
                valor: Number(prop.get('valor')) || 0,
              })
            )
              cont.follow_up_proposta++
          }
        }
      }
    }

    var quando = String(n.get('proxima_acao_em') || '').trim()
    var proximaOk = false
    if (quando && quando.indexOf('0001-01-01') !== 0) {
      var msQ = Date.parse(quando.replace(' ', 'T'))
      if (!isNaN(msQ) && msQ >= agora - 60 * 1000) proximaOk = true
    }
    if (!proximaOk) {
      if (
        inserir('alerta_sem_proxima_acao', n, resp, {
          proxima_acao_em: quando,
          estagio: estagio,
        })
      )
        cont.alerta_sem_proxima_acao++
    }

    var entrou = abertaPorNegocio[n.id]
    if (entrou) {
      var msE2 = Date.parse(String(entrou).replace(' ', 'T'))
      if (!isNaN(msE2)) {
        var seg = Math.max(0, Math.floor((agora - msE2) / 1000))
        var diasParada = Math.floor(seg / 86400)
        if (diasParada > limiteParadaDias) {
          if (
            inserir('alerta_parada', n, resp, {
              dias_na_etapa: diasParada,
              limite_dias: limiteParadaDias,
              etapa: estagio,
            })
          )
            cont.alerta_parada++
        }
      }
    }
  }

  $app
    .logger()
    .info(
      'T306 automacoes diarias',
      'dia',
      diaReferencia,
      'follow_up_proposta',
      String(cont.follow_up_proposta),
      'follow_up_sem_resposta',
      String(cont.follow_up_sem_resposta),
      'alerta_sem_proxima_acao',
      String(cont.alerta_sem_proxima_acao),
      'alerta_parada',
      String(cont.alerta_parada),
    )
})

// Execução manual (admin-only) — mesma lógica inline (JSVM não compartilha código).
routerAdd(
  'POST',
  '/backend/v1/automacoes/executar',
  (e) => {
    var actor = e.auth
    if (!actor || actor.get('role') !== 'admin') {
      return e.json(403, { error: 'Execução manual é exclusiva de administradores.' })
    }
    var agora = Date.now()
    var diaReferencia = new Date().toISOString().slice(0, 10)
    var DIA_MS = 86400000
    var LIMITE_FOLLOW_UP_DIAS = 3
    var LIMITE_SEM_RESPOSTA_DIAS = 7

    var col
    try {
      col = $app.findCollectionByNameOrId('automacoes_execucoes')
    } catch (err) {
      return e.json(500, { error: 'Coleção de execuções indisponível.' })
    }

    var limiteParadaDias = 10
    try {
      var cfgs = $app.findRecordsByFilter(
        'configuracoes_operacionais',
        "chave = 'limite_oportunidade_parada_dias'",
        '',
        1,
        0,
      )
      if (cfgs.length > 0) {
        var v = Number(cfgs[0].get('valor_numero'))
        if (Number.isFinite(v) && v >= 0) limiteParadaDias = v
      }
    } catch (_) {}

    var perms = []
    try {
      perms = $app.findRecordsByFilter('permanencias_negocio', '', '-created', 20000, 0)
    } catch (_) {
      perms = []
    }
    var abertaPorNegocio = {}
    for (var p = 0; p < perms.length; p++) {
      var saiu = String(perms[p].get('saiu_em') || '')
      var fechada = saiu !== '' && saiu.indexOf('0001-01-01') !== 0
      if (fechada) continue
      var nid = String(perms[p].get('negocio') || '')
      if (!abertaPorNegocio[nid]) {
        abertaPorNegocio[nid] = String(perms[p].get('entrou_em') || '')
      }
    }

    var FINAL = ['fechado_ganho', 'fechado_perdido']
    var negocios = []
    try {
      negocios = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar oportunidades: ' + String(err) })
    }

    var propostas = []
    try {
      propostas = $app.findRecordsByFilter('propostas', "status = 'emitida'", '-created', 20000, 0)
    } catch (_) {
      propostas = []
    }
    var propostaPorNegocio = {}
    for (var pr = 0; pr < propostas.length; pr++) {
      var pid = String(propostas[pr].get('negocio') || '')
      if (!propostaPorNegocio[pid]) propostaPorNegocio[pid] = propostas[pr]
    }

    var inserir = function (regra, negocio, responsavel, detalhe) {
      try {
        var dup = $app.findRecordsByFilter(
          'automacoes_execucoes',
          'regra = {:r} && negocio = {:n} && dia_referencia = {:d}',
          '',
          1,
          0,
          { r: regra, n: negocio.id, d: diaReferencia },
        )
        if (dup.length > 0) return false
      } catch (_) {}
      var rec = new Record(col)
      rec.set('regra', regra)
      rec.set('negocio', negocio.id)
      if (responsavel) rec.set('responsavel', responsavel)
      rec.set('detalhe', JSON.stringify(detalhe))
      rec.set('dia_referencia', diaReferencia)
      try {
        $app.save(rec)
        return true
      } catch (err) {
        $app.logger().warn('T306 registro duplicado ignorado', 'error', String(err))
        return false
      }
    }

    var cont = {
      follow_up_proposta: 0,
      follow_up_sem_resposta: 0,
      alerta_sem_proxima_acao: 0,
      alerta_parada: 0,
    }

    for (var i = 0; i < negocios.length; i++) {
      var n = negocios[i]
      if (n.get('arquivado') === true) continue
      var estagio = String(n.get('estagio') || '')
      if (FINAL.indexOf(estagio) >= 0) continue
      var resp = String(n.get('responsavel') || '')

      var prop = propostaPorNegocio[n.id]
      if (prop) {
        var emitidaEm = String(prop.get('emitida_em') || prop.get('created') || '')
        if (emitidaEm && emitidaEm.indexOf('0001-01-01') !== 0) {
          var msE = Date.parse(emitidaEm.replace(' ', 'T'))
          if (!isNaN(msE)) {
            var dias = Math.floor((agora - msE) / DIA_MS)
            if (dias >= LIMITE_SEM_RESPOSTA_DIAS) {
              if (
                inserir('follow_up_sem_resposta', n, resp, {
                  dias_sem_resposta: dias,
                  versao_proposta: Number(prop.get('versao')) || 0,
                  valor: Number(prop.get('valor')) || 0,
                })
              )
                cont.follow_up_sem_resposta++
            } else if (dias >= LIMITE_FOLLOW_UP_DIAS) {
              if (
                inserir('follow_up_proposta', n, resp, {
                  dias_desde_envio: dias,
                  versao_proposta: Number(prop.get('versao')) || 0,
                  valor: Number(prop.get('valor')) || 0,
                })
              )
                cont.follow_up_proposta++
            }
          }
        }
      }

      var quando = String(n.get('proxima_acao_em') || '').trim()
      var proximaOk = false
      if (quando && quando.indexOf('0001-01-01') !== 0) {
        var msQ = Date.parse(quando.replace(' ', 'T'))
        if (!isNaN(msQ) && msQ >= agora - 60 * 1000) proximaOk = true
      }
      if (!proximaOk) {
        if (
          inserir('alerta_sem_proxima_acao', n, resp, {
            proxima_acao_em: quando,
            estagio: estagio,
          })
        )
          cont.alerta_sem_proxima_acao++
      }

      var entrou = abertaPorNegocio[n.id]
      if (entrou) {
        var msE2 = Date.parse(String(entrou).replace(' ', 'T'))
        if (!isNaN(msE2)) {
          var seg = Math.max(0, Math.floor((agora - msE2) / 1000))
          var diasParada = Math.floor(seg / 86400)
          if (diasParada > limiteParadaDias) {
            if (
              inserir('alerta_parada', n, resp, {
                dias_na_etapa: diasParada,
                limite_dias: limiteParadaDias,
                etapa: estagio,
              })
            )
              cont.alerta_parada++
          }
        }
      }
    }

    $app
      .logger()
      .info('T306 automacoes manuais', 'dia', diaReferencia, 'execucoes', JSON.stringify(cont))
    return e.json(200, {
      dia_referencia: diaReferencia,
      execucoes: cont,
      executado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)

// Leitura estruturada: execuções do dia agrupadas por regra.
routerAdd('GET', '/backend/v1/automacoes/execucoes', (e) => {
  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  var dia = String(e.request.url.query().get('dia') || '').trim()
  if (!dia) dia = new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    return e.json(400, { error: 'Parâmetro dia inválido. Use YYYY-MM-DD.' })
  }
  var regs
  try {
    // dia_referencia é date (armazenado com hora "00:00:00.000Z") — comparar por
    // intervalo do dia [dia 00:00, dia+1 00:00) para casar com o formato PB.
    var diaInicio = dia + ' 00:00:00.000Z'
    var diaFim = new Date(Date.parse(dia + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)
    diaFim = diaFim + ' 00:00:00.000Z'
    regs = $app.findRecordsByFilter(
      'automacoes_execucoes',
      'dia_referencia >= {:ini} && dia_referencia < {:fim}',
      '-created',
      500,
      0,
      { ini: diaInicio, fim: diaFim },
    )
  } catch (_) {
    regs = []
  }
  var porRegra = {}
  var REGRAS = [
    'follow_up_proposta',
    'follow_up_sem_resposta',
    'alerta_sem_proxima_acao',
    'alerta_parada',
  ]
  for (var r = 0; r < REGRAS.length; r++) {
    porRegra[REGRAS[r]] = { total: 0, itens: [] }
  }
  for (var i = 0; i < regs.length; i++) {
    var rec = regs[i]
    var regra = String(rec.get('regra') || '')
    if (!porRegra[regra]) continue
    var negocioTitulo = ''
    try {
      negocioTitulo = String(
        $app.findRecordById('negocios', String(rec.get('negocio') || '')).get('titulo') || '',
      )
    } catch (_) {}
    var respNome = ''
    try {
      respNome = String(
        $app.findRecordById('_pb_users_auth_', String(rec.get('responsavel') || '')).get('name') ||
          '',
      )
    } catch (_) {}
    var detalhe = {}
    try {
      detalhe = JSON.parse(String(rec.get('detalhe') || '{}'))
    } catch (_) {
      detalhe = {}
    }
    porRegra[regra].total++
    porRegra[regra].itens.push({
      id: rec.id,
      negocio: String(rec.get('negocio') || ''),
      negocio_titulo: negocioTitulo,
      responsavel: respNome,
      detalhe: detalhe,
      created: String(rec.get('created') || ''),
    })
  }
  return e.json(200, { dia: dia, regras: porRegra })
})
