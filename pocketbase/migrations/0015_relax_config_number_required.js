migrate(
  (app) => {
    // PocketBase trata 0 como "blank" em number required — o limite configurável
    // precisa aceitar 0 (parada imediata em teste). O hook valida valor >= 0 e
    // cai no padrão 10 se o registro estiver ausente/inválido.
    const configs = app.findCollectionByNameOrId('configuracoes_operacionais')
    const field = configs.fields.getByName('valor_numero')
    if (field && field.required) {
      field.required = false
      app.save(configs)
    }
  },
  (app) => {
    try {
      const configs = app.findCollectionByNameOrId('configuracoes_operacionais')
      const field = configs.fields.getByName('valor_numero')
      if (field) {
        field.required = true
        app.save(configs)
      }
    } catch (_) {}
  },
)
