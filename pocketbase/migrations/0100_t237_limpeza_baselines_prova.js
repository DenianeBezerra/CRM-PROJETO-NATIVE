migrate(
  (app) => {
    // T2.37 — limpeza: baselines de prova (v1–v4 do período 2026-09-01..10,
    // criados antes do fix de reprodutibilidade). Mantém apenas a v5 (última,
    // com o cálculo corrigido e orfas reportadas).
    try {
      const rows = app.findRecordsByFilter(
        'baselines',
        'periodo_inicio = {:ini} && periodo_fim = {:fim} && versao < {:v}',
        '',
        200,
        0,
        { ini: '2026-09-01 00:00:00.000Z', fim: '2026-09-10 00:00:00.000Z', v: 5 },
      )
      for (let i = 0; i < rows.length; i++) app.delete(rows[i])
    } catch (_) {}
  },
  (app) => {},
)
