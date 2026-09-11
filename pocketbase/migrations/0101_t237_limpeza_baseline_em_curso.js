migrate(
  (app) => {
    // T2.37 — limpeza final: o baseline do período em curso (2026-09-01..30,
    // reproduzivel=false) foi prova do GREEN-4; removido para deixar estado
    // limpo. Permanece apenas o baseline fechado e reproduzível (v5).
    try {
      const rows = app.findRecordsByFilter('baselines', 'periodo_fim = {:fim}', '', 10, 0, {
        fim: '2026-09-30 00:00:00.000Z',
      })
      for (let i = 0; i < rows.length; i++) app.delete(rows[i])
    } catch (_) {}
  },
  (app) => {},
)
