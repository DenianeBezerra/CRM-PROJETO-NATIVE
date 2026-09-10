migrate(
  (app) => {
    // T2.06 — limpeza final das fixtures da prova de saneamento (todas as
    // execuções da rota de debug). Idempotente.
    let fixtures = []
    try {
      fixtures = app.findRecordsByFilter(
        'auditoria',
        "registro_id = 'fixture-sanitizacao-t206'",
        '',
        100,
        0,
      )
    } catch (_) {
      fixtures = []
    }
    for (let i = 0; i < fixtures.length; i++) app.delete(fixtures[i])
  },
  (app) => {
    // Rollback: nada a fazer.
  },
)
