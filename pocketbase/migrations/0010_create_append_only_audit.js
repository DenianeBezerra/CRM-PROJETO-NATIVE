migrate(
  (app) => {
    if (app.hasTable('auditoria')) return

    const audit = new Collection({
      name: 'auditoria',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'entidade', type: 'text', required: true, max: 80 },
        { name: 'registro_id', type: 'text', required: true, max: 80 },
        {
          name: 'acao',
          type: 'select',
          values: ['create', 'update'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'ator_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: true,
        },
        { name: 'ocorrido_em', type: 'date', required: true },
        { name: 'estado_anterior', type: 'text', max: 20000 },
        { name: 'estado_posterior', type: 'text', max: 20000, required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_entidade_registro ON auditoria (entidade, registro_id)',
        'CREATE INDEX idx_auditoria_ocorrido_em ON auditoria (ocorrido_em)',
      ],
    })
    app.save(audit)
  },
  (app) => {
    // Audit history is append-only; rollback does not delete recorded events.
  },
)
