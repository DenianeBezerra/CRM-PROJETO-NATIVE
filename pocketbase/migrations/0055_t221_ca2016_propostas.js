migrate(
  (app) => {
    // T2.21 — CA-2-016: rascunho de proposta versionada.
    // Rascunho editável (update permitido ao dono/admin enquanto status=rascunho);
    // delete bloqueado. A emissão/congelamento é a T2.22.
    if (app.hasTable('propostas')) return

    const col = new Collection({
      name: 'propostas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        {
          name: 'negocio',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('negocios').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'valor', type: 'number', required: true, min: 0.01 },
        { name: 'validade', type: 'date', required: true },
        {
          name: 'responsavel',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'resumo', type: 'text', required: true, max: 5000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['rascunho', 'emitida', 'aceita', 'recusada'],
        },
        {
          name: 'criado_por',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_prop_negocio ON propostas (negocio)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('propostas'))
    } catch (_) {}
  },
)
