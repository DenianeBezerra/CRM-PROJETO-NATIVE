// T3.15 — SPEC-3-015: Visão de coordenação (cap. 6.2) + Visão comercial (cap. 6.3).
// Rotas SOMENTE LEITURA — nenhum endpoint de escrita novo.
//   GET /backend/v1/visao/coordenacao  — admin-only: matriz clientes × obrigações do ciclo,
//     exceções por cliente/analista com tempo em aberto, carga por analista,
//     sinalização de volume acima da referência e fichas desatualizadas.
//   GET /backend/v1/visao/comercial    — auth: resumo por cliente (em dia, contagem de
//     exceções, último fechamento). NUNCA retorna obrigações individuais, parâmetros
//     da ficha ou identificadores de cofre (CA-3-060/061).
// Runtime goja: TODOS os helpers INLINE em cada escopo (AP-0200 — helpers top-level
// não são visíveis em callbacks aninhados).

routerAdd(
  'GET',
  '/backend/v1/visao/coordenacao',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Visão de coordenação é exclusiva de administradores.' })
    }

    var parseData = function (s) {
      if (!s || String(s).indexOf('0001-01-01') === 0) return null
      var ms = Date.parse(String(s).replace(' ', 'T'))
      return isNaN(ms) ? null : ms
    }
    var agora = Date.now()
    var DIA = 86400000

    // N dias para ficha desatualizada (config editável; padrão 30 — D13)
    var nDias = 30
    try {
      var cfgs = $app.findRecordsByFilter(
        'configuracoes_operacionais',
        "chave = 'visao_ficha_desatualizada_dias'",
        '',
        1,
        0,
      )
      if (cfgs.length > 0) {
        var v = Number(cfgs[0].get('valor') || 0)
        if (v > 0) nDias = v
      }
    } catch (_) {}

    // ---- Empresas ativas com ficha ----
    var fichas = []
    try {
      fichas = $app.findRecordsByFilter('fichas_operacionais', '', '-updated', 500, 0)
    } catch (_) {}
    var empresas = {}
    try {
      var emps = $app.findRecordsByFilter('empresas', '', '', 500, 0)
      for (var i = 0; i < emps.length; i++) {
        empresas[emps[i].id] = String(emps[i].get('nome') || emps[i].id)
      }
    } catch (_) {}

    var matriz = []
    var fichasDesatualizadas = []
    var volumesAcima = []
    var analistas = {}

    for (var f = 0; f < fichas.length; f++) {
      var ficha = fichas[f]
      var empresaId = String(ficha.get('empresa') || '')
      var nomeEmpresa = empresas[empresaId] || empresaId
      var statusOp = String(ficha.get('status_operacional') || '')

      // ficha desatualizada (só fichas ativas)
      var upd = parseData(String(ficha.get('updated') || ''))
      if (statusOp === 'ativo' && upd && agora - upd > nDias * DIA) {
        fichasDesatualizadas.push({
          empresa: nomeEmpresa,
          updated_em: String(ficha.get('updated') || '').slice(0, 10),
          dias_desatualizada: Math.floor((agora - upd) / DIA),
        })
      }

      // obrigações da empresa (ciclo corrente = todas não concluídas + concluídas do período)
      var obs = []
      try {
        obs = $app.findRecordsByFilter('obrigacoes', 'cliente = {:c}', '-prazo_limite', 500, 0, {
          c: empresaId,
        })
      } catch (_) {}
      var contagem = {
        prevista: 0,
        em_execucao: 0,
        atrasada: 0,
        bloqueada: 0,
        concluida: 0,
        nao_aplicavel: 0,
      }
      var proxima = null
      var concluidasCiclo = 0
      for (var o = 0; o < obs.length; o++) {
        var st = String(obs[o].get('status') || '')
        if (contagem[st] !== undefined) contagem[st]++
        if (st === 'concluida') concluidasCiclo++
        if (st === 'prevista' || st === 'em_execucao') {
          var prazo = parseData(String(obs[o].get('prazo_limite') || ''))
          if (prazo && (!proxima || prazo < proxima.prazo_ms)) {
            proxima = {
              tipo: String(obs[o].get('tipo') || ''),
              prazo: String(obs[o].get('prazo_limite') || '').slice(0, 10),
              prazo_ms: prazo,
            }
          }
        }
        // carga por analista (pendentes)
        if (st === 'prevista' || st === 'em_execucao' || st === 'atrasada') {
          var resp = String(obs[o].get('responsavel') || '')
          if (resp) {
            if (!analistas[resp]) analistas[resp] = { pendentes: 0, clientes: {} }
            analistas[resp].pendentes++
            analistas[resp].clientes[empresaId] = true
          }
        }
      }
      if (proxima) delete proxima.prazo_ms

      // volume executado vs referência (sinalização)
      var volRef = Number(ficha.get('volume_referencia_pagamentos') || 0)
      var volExec = concluidasCiclo
      if (volRef > 0 && volExec > volRef) {
        volumesAcima.push({
          empresa: nomeEmpresa,
          executado_ciclo: volExec,
          referencia: volRef,
        })
      }

      matriz.push({
        empresa: nomeEmpresa,
        empresa_id: empresaId,
        status_operacional: statusOp,
        contagem: contagem,
        pendentes: contagem.prevista + contagem.em_execucao + contagem.atrasada,
        proxima_obrigacao: proxima,
      })
    }

    // ---- Exceções abertas por cliente e por analista ----
    var excecoes = []
    var porAnalista = {}
    try {
      var exs = $app.findRecordsByFilter('excecoes', "status = 'aberta'", '-aberta_em', 500, 0)
      for (var x = 0; x < exs.length; x++) {
        var ex = exs[x]
        var cid = String(ex.get('cliente') || '')
        var aberta = parseData(String(ex.get('aberta_em') || ''))
        var dias = aberta ? Math.floor((agora - aberta) / DIA) : null
        var item = {
          tipo: String(ex.get('tipo') || ''),
          empresa: empresas[cid] || cid,
          descricao: String(ex.get('descricao') || '').slice(0, 140),
          aberta_em: String(ex.get('aberta_em') || '').slice(0, 10),
          dias_aberta: dias,
          escalada_coordenacao: ex.get('escalada_coordenacao') === true,
          reincidencia: Number(ex.get('reincidencia') || 0),
        }
        excecoes.push(item)
        var dest = String(ex.get('destinatario_analista') || '')
        if (dest) {
          if (!porAnalista[dest]) porAnalista[dest] = { abertas: 0, mais_antiga_dias: 0 }
          porAnalista[dest].abertas++
          if (dias && dias > porAnalista[dest].mais_antiga_dias)
            porAnalista[dest].mais_antiga_dias = dias
        }
      }
    } catch (_) {}

    // ---- Carga por analista (nomes resolvidos) ----
    var carga = []
    for (var uid in analistas) {
      var nome = 'não atribuído'
      try {
        nome = String($app.findRecordById('_pb_users_auth_', uid).get('name') || 'não atribuído')
      } catch (_) {}
      var nClientes = 0
      for (var k in analistas[uid].clientes) nClientes++
      carga.push({
        analista: nome,
        analista_id: uid,
        obrigacoes_pendentes: analistas[uid].pendentes,
        clientes_atendidos: nClientes,
      })
    }
    carga.sort(function (a, b) {
      return b.obrigacoes_pendentes - a.obrigacoes_pendentes
    })

    var cargaExcecoes = []
    for (var u2 in porAnalista) {
      var nome2 = 'não atribuído'
      try {
        nome2 = String($app.findRecordById('_pb_users_auth_', u2).get('name') || 'não atribuído')
      } catch (_) {}
      cargaExcecoes.push({
        analista: nome2,
        abertas: porAnalista[u2].abertas,
        mais_antiga_dias: porAnalista[u2].mais_antiga_dias,
      })
    }

    return e.json(200, {
      gerado_em: new Date().toISOString(),
      config_ficha_desatualizada_dias: nDias,
      matriz: matriz,
      excecoes_abertas: excecoes,
      excecoes_por_analista: cargaExcecoes,
      carga_por_analista: carga,
      volumes_acima_referencia: volumesAcima,
      fichas_desatualizadas: fichasDesatualizadas,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/visao/comercial',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })

    var parseData = function (s) {
      if (!s || String(s).indexOf('0001-01-01') === 0) return null
      var ms = Date.parse(String(s).replace(' ', 'T'))
      return isNaN(ms) ? null : ms
    }

    var empresas = {}
    try {
      var emps = $app.findRecordsByFilter('empresas', '', '', 500, 0)
      for (var i = 0; i < emps.length; i++) {
        empresas[emps[i].id] = String(emps[i].get('nome') || emps[i].id)
      }
    } catch (_) {}

    // atrasos por cliente + último fechamento concluído
    var atrasosPorCliente = {}
    var fechamentoPorCliente = {}
    try {
      var obs = $app.findRecordsByFilter('obrigacoes', '', '', 2000, 0)
      for (var o = 0; o < obs.length; o++) {
        var cid = String(obs[o].get('cliente') || '')
        var st = String(obs[o].get('status') || '')
        var tipo = String(obs[o].get('tipo') || '')
        if (st === 'atrasada') {
          atrasosPorCliente[cid] = (atrasosPorCliente[cid] || 0) + 1
        }
        if (tipo === 'fechamento' && st === 'concluida') {
          var dc = parseData(String(obs[o].get('data_conclusao') || ''))
          if (dc && (!fechamentoPorCliente[cid] || dc > fechamentoPorCliente[cid].ms)) {
            fechamentoPorCliente[cid] = {
              ms: dc,
              data: String(obs[o].get('data_conclusao') || '').slice(0, 10),
            }
          }
        }
      }
    } catch (_) {}

    // exceções abertas por cliente (SOMENTE contagem — cap. 6.3)
    var excecoesPorCliente = {}
    try {
      var exs = $app.findRecordsByFilter('excecoes', "status = 'aberta'", '', 500, 0)
      for (var x = 0; x < exs.length; x++) {
        var cid2 = String(exs[x].get('cliente') || '')
        excecoesPorCliente[cid2] = (excecoesPorCliente[cid2] || 0) + 1
      }
    } catch (_) {}

    var clientes = []
    for (var eid in empresas) {
      var emDia = !(atrasosPorCliente[eid] > 0) && !(excecoesPorCliente[eid] > 0)
      clientes.push({
        empresa: empresas[eid],
        empresa_id: eid,
        operacao_em_dia: emDia,
        excecoes_abertas: excecoesPorCliente[eid] || 0,
        ultimo_fechamento: fechamentoPorCliente[eid] ? fechamentoPorCliente[eid].data : null,
      })
    }
    clientes.sort(function (a, b) {
      return a.empresa.localeCompare(b.empresa)
    })

    return e.json(200, { gerado_em: new Date().toISOString(), clientes: clientes })
  },
  $apis.requireAuth(),
)
