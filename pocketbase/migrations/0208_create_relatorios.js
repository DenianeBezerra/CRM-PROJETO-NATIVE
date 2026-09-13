migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('relatorios')
      return // Já existe
    } catch (_) {
      // Prossiga com a criação
    }

    const collection = new Collection({
      name: 'relatorios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'destinatario', type: 'text', required: true },
        { name: 'assunto', type: 'text', required: true },
        { name: 'corpo', type: 'text', required: true },
        { name: 'periodo', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['gerado', 'enviado', 'falhou'],
          maxSelect: 1,
          required: true,
        },
        { name: 'criado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_relatorios_created ON relatorios (created DESC)',
        'CREATE INDEX idx_relatorios_status ON relatorios (status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('relatorios')
      app.delete(collection)
    } catch (_) {}
  },
)
