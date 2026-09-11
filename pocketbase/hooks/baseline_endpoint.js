// T2.37 — CA-2-032: baseline de métricas (calcular + listar).
// POST /backend/v1/metricas/baseline (admin) — calcula as métricas do
// dicionário para um PERÍODO EXPLÍCITO (inicio/fim obrigatórios), congela o
// JSON com versão sequencial por período (re-execução cria nova versão,
// nunca sobrescreve) e registra ator/data.
// GET  /backend/v1/metricas/baseline (autenticado) — lista baselines.
// Reprodutibilidade: as métricas são calculadas FILTRANDO a origem pelo
// período (created dentro de [inicio, fim]); período em curso é marcado
// reproduzivel=false (números ainda mudam — transparência, sem maquiar).
// Lições JSVM: lógica inline; datas PB " " → "T"; JSON.parse(String(raw)).
routerAdd(
  'POST',
  '/backend/v1/metricas/baseline',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }
    if (actor.get('role') !== 'admin') {
      return e.json(403, { error: 'Somente administrador calcula baseline.' })
    }

    const body = e.requestInfo().body
    const inicio = String(body.periodo_inicio || '').trim()
    const fim = String(body.periodo_fim || '').trim()
    if (!inicio || !fim) {
      return e.json(400, {
        error: 'Período explícito obrigatório: informe periodo_inicio e periodo_fim (YYYY-MM-DD).',
      })
    }
    const msInicio = Date.parse(inicio + 'T00:00:00Z')
    const msFim = Date.parse(fim + 'T23:59:59Z')
    if (isNaN(msInicio) || isNaN(msFim)) {
      return e.json(400, { error: 'Datas inválidas: use o formato YYYY-MM-DD.' })
    }
    if (msInicio > msFim) {
      return e.json(400, { error: 'Período inválido: inicio deve ser anterior ou igual a fim.' })
    }

    const agoraISO = new Date().toISOString()
    const emCurso = msFim >= Date.now()

    // ---- Cálculo das métricas do dicionário, filtrando a origem pelo período ----
    const metricas = []

    // 1) oportunidades_por_status (criadas no período)
    let deals = []
    try {
      deals = $app.findRecordsByFilter(
        'negocios',
        'created >= {:ini} && created <= {:fim}',
        '-created',
        20000,
        0,
        { ini: inicio + ' 00:00:00.000Z', fim: fim + ' 23:59:59.999Z' },
      )
    } catch (err) {
      $app.logger().error('T237 falha ao consultar negocios', 'error', String(err))
    }
    let ativas = 0
    let ganhas = 0
    let perdidas = 0
    let arquivadas = 0
    for (const d of deals) {
      if (d.getBool('arquivado')) {
        arquivadas++
        continue
      }
      const st = d.getString('estagio')
      if (st === 'fechado_ganho') ganhas++
      else if (st === 'fechado_perdido') perdidas++
      else ativas++
    }
    metricas.push({
      chave: 'oportunidades_por_status',
      fonte: 'negocios (created no período)',
      valores: {
        ativas: ativas,
        fechado_ganho: ganhas,
        fechado_perdido: perdidas,
        arquivadas: arquivadas,
      },
    })

    // 2) tempo_por_etapa (permanências entradas no período)
    let perms = []
    try {
      perms = $app.findRecordsByFilter(
        'permanencias_negocio',
        'entrou_em >= {:ini} && entrou_em <= {:fim}',
        '',
        20000,
        0,
        { ini: inicio + ' 00:00:00.000Z', fim: fim + ' 23:59:59.999Z' },
      )
    } catch (err) {
      $app.logger().error('T237 falha ao consultar permanencias', 'error', String(err))
    }
    const totaisEtapa = {}
    let permanenciasOrfas = 0
    for (const p of perms) {
      const etapa = p.getString('etapa')
      const entrou = new Date(String(p.get('entrou_em') || '').replace(' ', 'T')).getTime()
      const saiuRaw = String(p.get('saiu_em') || '')
      const fechada = saiuRaw !== '' && !saiuRaw.startsWith('0001-01-01')
      let segundos = 0
      if (fechada) {
        const saiu = new Date(saiuRaw.replace(' ', 'T')).getTime()
        if (Number.isFinite(entrou) && Number.isFinite(saiu)) {
          segundos = Math.max(0, Math.floor((saiu - entrou) / 1000))
        }
      } else {
        // T2.37 — permanência aberta só é reprodutível se o negócio existe e o
        // período está fechado: aberta conta "até agora" (muda a cada leitura).
        // Órfãs (negócio deletado) são EXCLUÍDAS e reportadas — nunca somadas.
        let negocioExiste = false
        try {
          $app.findRecordById('negocios', p.getString('negocio'))
          negocioExiste = true
        } catch (_) {
          negocioExiste = false
        }
        if (!negocioExiste) {
          permanenciasOrfas++
          continue
        }
        if (emCurso || !Number.isFinite(entrou)) {
          continue // aberta + período em curso = não reproduzível; excluída do congelamento
        }
        segundos = Math.max(0, Math.floor((msFim - entrou) / 1000))
      }
      totaisEtapa[etapa] = (totaisEtapa[etapa] || 0) + segundos
    }
    metricas.push({
      chave: 'tempo_por_etapa',
      fonte: 'permanencias_negocio (entrou_em no período)',
      valores: totaisEtapa,
      permanencias_orfas_excluidas: permanenciasOrfas,
    })

    // 3) propostas emitidas no período
    let propostas = []
    try {
      propostas = $app.findRecordsByFilter(
        'propostas',
        'created >= {:ini} && created <= {:fim}',
        '',
        20000,
        0,
        { ini: inicio + ' 00:00:00.000Z', fim: fim + ' 23:59:59.999Z' },
      )
    } catch (err) {
      $app.logger().error('T237 falha ao consultar propostas', 'error', String(err))
    }
    const porStatusProposta = {}
    let valorTotalPropostas = 0
    for (const p of propostas) {
      const st = p.getString('status') || 'rascunho'
      porStatusProposta[st] = (porStatusProposta[st] || 0) + 1
      valorTotalPropostas += Number(p.get('valor')) || 0
    }
    metricas.push({
      chave: 'propostas_por_status',
      fonte: 'propostas (created no período)',
      valores: {
        por_status: porStatusProposta,
        valor_total: valorTotalPropostas,
        total: propostas.length,
      },
    })

    // ---- Versão sequencial por período (nunca sobrescreve) ----
    let versao = 1
    try {
      const anteriores = $app.findRecordsByFilter(
        'baselines',
        'periodo_inicio = {:ini} && periodo_fim = {:fim}',
        '-versao',
        1,
        0,
        { ini: inicio + ' 00:00:00.000Z', fim: fim + ' 00:00:00.000Z' },
      )
      if (anteriores.length > 0) {
        versao = (Number(anteriores[0].get('versao')) || 0) + 1
      }
    } catch (err) {
      $app.logger().error('T237 falha ao checar versao anterior', 'error', String(err))
    }

    const col = $app.findCollectionByNameOrId('baselines')
    const rec = new Record(col)
    rec.set('periodo_inicio', inicio + ' 00:00:00.000Z')
    rec.set('periodo_fim', fim + ' 00:00:00.000Z')
    rec.set('versao', versao)
    rec.set('metricas', JSON.stringify(metricas))
    rec.set('fuso', 'America/Sao_Paulo')
    rec.set('fonte_endpoint', 'POST /backend/v1/metricas/baseline')
    rec.set('calculado_por', actor.id)
    rec.set('reproduzivel', !emCurso)
    rec.set('criado_em', agoraISO)
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao congelar baseline: ' + String(err) })
    }

    $app
      .logger()
      .info('T237 baseline congelado', 'periodo', inicio + '..' + fim, 'versao', String(versao))
    return e.json(200, {
      ok: true,
      id: rec.id,
      periodo: { inicio: inicio, fim: fim },
      versao: versao,
      reproduzivel: !emCurso,
      metricas: metricas,
      calculado_em: agoraISO,
    })
  },
  $apis.requireAuth(),
)

// GET /backend/v1/metricas/baseline — lista baselines (mais recentes primeiro).
routerAdd(
  'GET',
  '/backend/v1/metricas/baseline',
  (e) => {
    if (!e.auth) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }
    let rows = []
    try {
      rows = $app.findRecordsByFilter('baselines', '', '-created', 200, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar baselines: ' + String(err) })
    }
    const baselines = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      let metricas = null
      try {
        const raw = r.get('metricas')
        metricas = JSON.parse(typeof raw === 'string' ? raw : String(raw))
      } catch (_) {
        metricas = null
      }
      baselines.push({
        id: r.id,
        periodo_inicio: String(r.get('periodo_inicio') || '').slice(0, 10),
        periodo_fim: String(r.get('periodo_fim') || '').slice(0, 10),
        versao: Number(r.get('versao')) || 0,
        metricas: metricas,
        fuso: String(r.get('fuso') || ''),
        calculado_por: String(r.get('calculado_por') || ''),
        reproduzivel: r.get('reproduzivel') === true,
        criado_em: String(r.get('criado_em') || ''),
      })
    }
    return e.json(200, { total: baselines.length, baselines: baselines })
  },
  $apis.requireAuth(),
)
