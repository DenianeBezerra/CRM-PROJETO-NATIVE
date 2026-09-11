migrate(
  (app) => {
    // T2.12 — limpeza final por ID direto (as migrations 0037/0038 anteriores
    // não alcançaram estes 2 registros órfãos; 0038 v1 foi aplicada antes da
    // reescrita, por isso esta é a 0039 com IDs explícitos). Idempotente.
    const orfas = ['rwb2sznw24rsgtj', '2gfnmz58y9nw4oa']
    for (const id of orfas) {
      try {
        app.delete(app.findRecordById('respostas_qualificacao', id))
      } catch (_) {}
    }
  },
  (app) => {},
)
