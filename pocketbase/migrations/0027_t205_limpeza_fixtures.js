migrate(
  (app) => {
    // T2.05 / CA-2-040 — limpeza das fixtures de teste acumuladas nas tasks
    // T2.01–T2.04. Executada no banco (contexto de sistema), contornando o
    // append-only das coleções de trilha — que permanece intacto na API.
    // Idempotente: só remove o que existir.

    // 1. Aceite forjado do RED-T204 (quantidade=99999, nunca correspondeu à base real).
    let forjados = []
    try {
      forjados = app.findRecordsByFilter('aceites_exportacao', 'quantidade = 99999', '', 100, 0)
    } catch {
      forjados = []
    }
    for (let i = 0; i < forjados.length; i++) app.delete(forjados[i])

    // 2. Eventos de teste da T2.03 (motivos marcados GREEN T2.03).
    let eventosT203 = []
    try {
      eventosT203 = app.findRecordsByFilter(
        'eventos_exportacao',
        'motivo ~ "GREEN T2.03"',
        '',
        100,
        0,
      )
    } catch {
      eventosT203 = []
    }
    for (let i = 0; i < eventosT203.length; i++) app.delete(eventosT203[i])

    // 3. Trilhas de exportação geradas pelas provas da T2.04 (aceites de teste:
    // criados por API sem exportação pela tela). Preserva as trilhas da Deniane
    // (exportações reais pela UI).
    let trilhas = []
    try {
      trilhas = app.findRecordsByFilter('exportacoes', 'aceite_id != ""', '-created', 100, 0)
    } catch {
      trilhas = []
    }
    // Identificar trilhas de teste: as cujo aceite não tem exportação real pela
    // UI é complexo; critério conservador — remove trilhas criadas nos minutos
    // das provas automatizadas (21:14–21:19 UTC de 2026-09-10), preserva as demais.
    for (let i = 0; i < trilhas.length; i++) {
      const quando = String(trilhas[i].get('ocorrido_em'))
      if (quando >= '2026-09-10 21:14:00' && quando <= '2026-09-10 21:19:59') {
        app.delete(trilhas[i])
      }
    }

    // 4. Aceites de teste criados por API nas provas (sem correspondência na UI):
    // quantidade declarada 8 com filtros vazios '{}' criados nas provas automatizadas.
    let aceitesTeste = []
    try {
      aceitesTeste = app.findRecordsByFilter(
        'aceites_exportacao',
        "filtros = '{}' && quantidade = 8",
        '-created',
        100,
        0,
      )
    } catch {
      aceitesTeste = []
    }
    for (let i = 0; i < aceitesTeste.length; i++) {
      const quando = String(aceitesTeste[i].get('created'))
      if (quando >= '2026-09-10 21:14:00' && quando <= '2026-09-10 21:20:00') {
        app.delete(aceitesTeste[i])
      }
    }
  },
  (app) => {
    // Rollback: nada a fazer — fixtures removidas não são restauradas.
  },
)
