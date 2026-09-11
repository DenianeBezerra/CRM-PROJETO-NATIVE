migrate(
  (app) => {
    // T2.24 — CA-2-019: rastreio da decisão humana (aceite/recusa).
    const col = app.findCollectionByNameOrId('propostas')
    if (!col.fields.getByName('decidida_em')) {
      col.fields.add(new Field({ name: 'decidida_em', type: 'date' }))
    }
    if (!col.fields.getByName('decidida_por')) {
      col.fields.add(
        new Field({
          name: 'decidida_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('canal_decisao')) {
      col.fields.add(
        new Field({
          name: 'canal_decisao',
          type: 'select',
          maxSelect: 1,
          values: ['ui', 'whatsapp', 'email', 'presencial', 'telefone'],
        }),
      )
    }
    if (!col.fields.getByName('observacao_decisao')) {
      col.fields.add(new Field({ name: 'observacao_decisao', type: 'text', max: 2000 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('propostas')
    try {
      for (const nome of ['decidida_em', 'decidida_por', 'canal_decisao', 'observacao_decisao']) {
        if (col.fields.getByName(nome)) col.fields.removeByName(nome)
      }
      app.save(col)
    } catch (_) {}
  },
)
