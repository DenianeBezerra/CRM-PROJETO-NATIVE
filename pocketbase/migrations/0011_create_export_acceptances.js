migrate(
  (app) => {
    if (app.hasTable('aceites_exportacao')) return

    const collection = new Collection({
      name: 'aceites_exportacao',
      type: 'base',
      listRule: "@request.auth.id = usuario || @request.auth.role = 'admin'",
      viewRule: "@request.auth.id = usuario || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: true,
        },
        {
          name: 'entidade',
          type: 'select',
          values: ['clientes', 'negocios'],
          maxSelect: 1,
          required: true,
        },
        { name: 'filtros', type: 'text', max: 2000, required: true },
        { name: 'quantidade', type: 'number', required: true, min: 0 },
        { name: 'finalidade', type: 'text', max: 200, required: true },
        { name: 'aceito_em', type: 'date', required: true },
        { name: 'versao_termo', type: 'text', max: 20, required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_aceites_exportacao_usuario ON aceites_exportacao (usuario)',
        'CREATE INDEX idx_aceites_exportacao_data ON aceites_exportacao (aceito_em)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('aceites_exportacao')
    if (collection) app.delete(collection)
  },
)
