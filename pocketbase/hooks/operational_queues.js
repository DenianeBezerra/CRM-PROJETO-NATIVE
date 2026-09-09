// Filas e contadores operacionais: leitura agregada sem expor dados de outras entidades.
// Rotas: GET /backend/v1/operacional/resumo
//        GET /backend/v1/operacional/tempo-por-etapa
//        GET /backend/v1/operacional/acoes-vencidas
//        GET /backend/v1/operacional/paradas
//
// Nota: constantes e funções auxiliares vivem DENTRO de cada callback — o runtime
// de hooks não resolve referências do escopo superior do arquivo.

routerAdd(
  'GET',
  '/backend/v1/operacional/resumo',
  (e) => {
    if (!e.auth) throw new Error('Autenticação obrigatória.')
    const FINAL_STAGES = ['fechado_ganho', 'fechado_perdido']
    const deals = $app.findCollectionByNameOrId('negocios')
    const all = $app.findRecordsByFilter(deals, '', '-created', 20000, 0)
    let ativas = 0
    let arquivadas = 0
    let ganhas = 0
    let perdidas = 0
    for (const deal of all) {
      const stage = deal.getString('estagio')
      if (deal.getBool('arquivado')) {
        arquivadas++
        continue
      }
      if (stage === 'fechado_ganho') ganhas++
      else if (stage === 'fechado_perdido') perdidas++
      else if (!FINAL_STAGES.includes(stage)) ativas++
    }
    return e.json(200, {
      oportunidades_ativas: ativas,
      arquivadas: arquivadas,
      fechado_ganho: ganhas,
      fechado_perdido: perdidas,
    })
  },
  $apis.requireAuth(),
)

// GET /backend/v1/operacional/tempo-por-etapa
// Tempo acumulado: intervalos encerrados + intervalo aberto até o momento da consulta.
routerAdd(
  'GET',
  '/backend/v1/operacional/tempo-por-etapa',
  (e) => {
    if (!e.auth) throw new Error('Autenticação obrigatória.')
    const stages = $app.findCollectionByNameOrId('etapas_negocio')
    const activeStages = $app.findRecordsByFilter(stages, 'ativa = true', 'ordem', 500, 0)
    const perms = $app.findCollectionByNameOrId('permanencias_negocio')
    const rows = $app.findRecordsByFilter(perms, '', '-created', 20000, 0)
    const now = Date.now()
    const totals = {}
    const openByDeal = {}

    for (const row of rows) {
      const dealId = row.getString('negocio')
      const stage = row.getString('etapa')
      const entered = new Date(row.get('entrou_em')).getTime()
      // Date vazio no goja vem como "0001-01-01..." (truthy) — tratar como aberto.
      const saiuRaw = String(row.get('saiu_em') || '')
      const isClosed = saiuRaw !== '' && !saiuRaw.startsWith('0001-01-01')
      const left = isClosed ? new Date(saiuRaw).getTime() : null
      let seconds = 0
      if (left != null && Number.isFinite(left)) {
        seconds = Math.max(0, Math.floor((left - entered) / 1000))
      } else {
        openByDeal[dealId] = (openByDeal[dealId] || 0) + 1
        seconds = Math.max(0, Math.floor((now - entered) / 1000))
      }
      totals[stage] = (totals[stage] || 0) + seconds
    }

    // Estado inválido: duas permanências abertas sinalizadas, sem somar duas vezes.
    const estadoInvalido = []
    for (const dealId of Object.keys(openByDeal)) {
      if (openByDeal[dealId] > 1) estadoInvalido.push(dealId)
    }

    const etapas = activeStages.map((stage) => ({
      etapa: stage.getString('chave'),
      nome: stage.getString('nome'),
      ativa: true,
      segundos: totals[stage.getString('chave')] || 0,
    }))
    // Etapas inativas com tempo apurado também aparecem, para não omitir histórico.
    const listed = new Set(etapas.map((s) => s.etapa))
    const allStages = $app.findRecordsByFilter(stages, '', 'ordem', 500, 0)
    for (const stage of allStages) {
      const key = stage.getString('chave')
      if (listed.has(key)) continue
      if (!totals[key]) continue
      etapas.push({
        etapa: key,
        nome: stage.getString('nome'),
        ativa: false,
        segundos: totals[key],
      })
    }
    return e.json(200, { etapas: etapas, estado_invalido: estadoInvalido })
  },
  $apis.requireAuth(),
)

// GET /backend/v1/operacional/acoes-vencidas
// Próxima ação passada entra na fila; ação futura não entra; arquivada/final não entra.
routerAdd(
  'GET',
  '/backend/v1/operacional/acoes-vencidas',
  (e) => {
    if (!e.auth) throw new Error('Autenticação obrigatória.')
    const FINAL_STAGES = ['fechado_ganho', 'fechado_perdido']
    const deals = $app.findCollectionByNameOrId('negocios')
    const all = $app.findRecordsByFilter(deals, '', '-created', 20000, 0)
    const now = Date.now()
    const vencidas = []
    for (const deal of all) {
      if (deal.getBool('arquivado')) continue
      if (FINAL_STAGES.includes(deal.getString('estagio'))) continue
      const when = deal.get('proxima_acao_em')
      if (!when) continue
      const due = new Date(when).getTime()
      if (!Number.isFinite(due)) continue
      if (due >= now) continue
      vencidas.push({
        id: deal.id,
        titulo: deal.getString('titulo'),
        estagio: deal.getString('estagio'),
        proxima_acao_em: when,
        proxima_acao_descricao: deal.getString('proxima_acao_descricao') || '',
      })
    }
    return e.json(200, { total: vencidas.length, itens: vencidas })
  },
  $apis.requireAuth(),
)

// GET /backend/v1/operacional/paradas
// Oportunidade parada: permanência aberta na etapa atual com duração acima do limite
// configurável (padrão 10 dias). Arquivada ou final não entra.
routerAdd(
  'GET',
  '/backend/v1/operacional/paradas',
  (e) => {
    if (!e.auth) throw new Error('Autenticação obrigatória.')
    const DAY_SECONDS = 86400
    const FINAL_STAGES = ['fechado_ganho', 'fechado_perdido']

    let limitDays = 10
    try {
      const configs = $app.findCollectionByNameOrId('configuracoes_operacionais')
      const rows = $app.findRecordsByFilter(
        configs,
        "chave = 'limite_oportunidade_parada_dias'",
        '',
        1,
        0,
      )
      if (rows.length > 0) {
        const value = Number(rows[0].get('valor_numero'))
        if (Number.isFinite(value) && value >= 0) limitDays = value
      }
    } catch (_) {
      /* usa o padrão */
    }
    const limitSeconds = limitDays * DAY_SECONDS

    const deals = $app.findCollectionByNameOrId('negocios')
    const all = $app.findRecordsByFilter(deals, '', '-created', 20000, 0)
    const now = Date.now()
    const perms = $app.findCollectionByNameOrId('permanencias_negocio')

    const paradas = []
    for (const deal of all) {
      if (deal.getBool('arquivado')) continue
      const stage = deal.getString('estagio')
      if (FINAL_STAGES.includes(stage)) continue
      const open = $app.findRecordsByFilter(
        perms,
        'negocio = {:negocio} && (saiu_em = "" || saiu_em ~ "0001-01-01")',
        '-created',
        2,
        0,
        { negocio: deal.id },
      )
      if (open.length !== 1) continue // sem permanência aberta ou estado inválido
      const entered = new Date(open[0].get('entrou_em')).getTime()
      const seconds = Math.max(0, Math.floor((now - entered) / 1000))
      if (seconds > limitSeconds) {
        paradas.push({
          id: deal.id,
          titulo: deal.getString('titulo'),
          estagio: stage,
          dias_na_etapa: Math.floor(seconds / DAY_SECONDS),
          limite_dias: limitDays,
        })
      }
    }
    return e.json(200, { limite_dias: limitDays, total: paradas.length, itens: paradas })
  },
  $apis.requireAuth(),
)
