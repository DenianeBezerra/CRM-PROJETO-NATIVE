migrate(
  (app) => {
    const etapas = app.findCollectionByNameOrId('etapas_negocio')
    try {
      etapas.fields.add(new Field({ name: 'migracao_destino', type: 'text', max: 80 }))
      app.save(etapas)
    } catch (_) {
      // idempotente
    }
  },
  (app) => {
    const etapas = app.findCollectionByNameOrId('etapas_negocio')
    try {
      etapas.fields.removeByName('migracao_destino')
      app.save(etapas)
    } catch (_) {
      // rollback tolerante
    }
  },
)
