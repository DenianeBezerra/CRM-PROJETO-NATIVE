migrate(
  (app) => {
    // T2.37 — limpeza dos baselines do teste humano (v1/v2 do período
    // 2026-09-01..12, criados na prova). Mantém apenas o estado final da task
    // (v5 de 2026-09-01..10, reproduzível).
    try {
      const rows = app.findRecordsByFilter('baselines', 'periodo_fim = {:fim}', '', 10, 0, {
        fim: '2026-09-12 00:00:00.000Z',
      })
      for (let i = 0; i < rows.length; i++) app.delete(rows[i])
    } catch (_) {}
  },
  (app) => {},
)
