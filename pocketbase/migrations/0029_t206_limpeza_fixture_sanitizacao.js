migrate(
  (app) => {
    // T2.06 — limpeza das fixtures da prova de saneamento (eventos de debug).
    // Idempotente: só remove o que existir.
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
