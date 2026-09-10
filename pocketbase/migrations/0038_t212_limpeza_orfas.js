migrate(
  (app) => {
    // T2.12 — limpeza residual: respostas órfãs (negocio de prova já removido).
    let orfas = []
    try {
      orfas = app.findRecordsByFilter('respostas_qualificacao', '', '-created', 100, 0)
    } catch (_) {}
    for (const r of orfas) {
      try {
        app.findRecordById('negocios', r.get('negocio'))
      } catch (_) {
        app.delete(r)
      }
    }
  },
  (app) => {},
)
