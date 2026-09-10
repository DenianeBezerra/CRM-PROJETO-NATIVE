migrate(
  (app) => {
    if (app.hasTable('eventos_exportacao')) return

    const collection = new Collection({
      name: 'eventos_exportacao',
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
        {
          name: 'evento',
          type: 'select',
          values: ['cancelado', 'negado', 'falha'],
          maxSelect: 1,
          required: true,
        },
        { name: 'filtros', type: 'text', max: 2000 },
        { name: 'quantidade', type: 'number', min: 0 },
        { name: 'motivo', type: 'text', max: 500 },
        { name: 'ocorrido_em', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_eventos_exportacao_usuario ON eventos_exportacao (usuario)',
        'CREATE INDEX idx_eventos_exportacao_ocorrido ON eventos_exportacao (ocorrido_em)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('eventos_exportacao')
    if (collection) app.delete(collection)
  },
)
