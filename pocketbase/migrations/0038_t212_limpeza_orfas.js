migrate(
  (app) => {
    // T2.12 — limpeza final: remove QUALQUER resposta de qualificação restante
    // das provas (o denominador real não tem oportunidades, logo nenhuma
    // resposta legítima pode existir). Idempotente.
    let todas = []
    try {
      todas = app.findRecordsByFilter('respostas_qualificacao', '', '-created', 100, 0)
    } catch (_) {}
    for (const r of todas) {
      try {
        app.delete(r)
      } catch (_) {}
    }
  },
  (app) => {},
)
