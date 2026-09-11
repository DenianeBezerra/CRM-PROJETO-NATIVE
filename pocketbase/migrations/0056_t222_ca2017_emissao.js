migrate(
  (app) => {
    // T2.22 — CA-2-017: emissão congela a versão. Campos de rastreio da
    // emissão (ator e data) + número de emissão sequencial por negócio.
    const col = app.findCollectionByNameOrId('propostas')
    if (!col.fields.getByName('emitida_em')) {
      col.fields.add(new Field({ name: 'emitida_em', type: 'date' }))
    }
    if (!col.fields.getByName('emitida_por')) {
      col.fields.add(
        new Field({
          name: 'emitida_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    try {
      if (col.fields.getByName('emitida_em')) col.fields.removeByName('emitida_em')
      if (col.fields.getByName('emitida_por')) col.fields.removeByName('emitida_por')
      app.save(col)
    } catch (_) {}
  },
)
