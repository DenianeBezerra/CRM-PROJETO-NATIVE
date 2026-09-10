migrate(
  (app) => {
    if (app.hasTable('exportacoes')) return

    const collection = new Collection({
      name: 'exportacoes',
      type: 'base',
      listRule: "@request.auth.id = usuario || @request.auth.role = 'admin'",
      viewRule: "@request.auth.id = usuario || @request.auth.role = 'admin'",
      createRule: null,
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
        { name: 'filtros', type: 'text', max: 2000 },
        { name: 'quantidade', type: 'number', required: true, min: 0 },
        { name: 'aceite_id', type: 'text', max: 30 },
        { name: 'csv_gerado', type: 'bool', required: true },
        { name: 'ocorrido_em', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_exportacoes_usuario ON exportacoes (usuario)',
        'CREATE INDEX idx_exportacoes_ocorrido ON exportacoes (ocorrido_em)',
        'CREATE INDEX idx_exportacoes_aceite ON exportacoes (aceite_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('exportacoes')
    if (collection) app.delete(collection)
  },
)
