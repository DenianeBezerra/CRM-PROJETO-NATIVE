migrate(
  (app) => {
    // T2.12 — remove a fixture ponta a ponta da prova final (negócio
    // "Teste T2.12 Deniane" + sua resposta) para o teste humano começar limpo.
    // Idempotente.
    try {
      const neg = app.findFirstRecordByFilter('negocios', 'titulo = "Teste T2.12 Deniane"')
      try {
        const resp = app.findFirstRecordByFilter(
          'respostas_qualificacao',
          'negocio = "' + neg.id + '"',
        )
        app.delete(resp)
      } catch (_) {}
      app.delete(neg)
    } catch (_) {}
  },
  (app) => {},
)
