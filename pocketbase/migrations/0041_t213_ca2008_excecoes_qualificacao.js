migrate(
  (app) => {
    // T2.13 — CA-2-008: exceção de liberação de avanço com pendência
    // obrigatória. Somente admin cria; delete bloqueado (append-only).
    if (app.hasTable('excecoes_qualificacao')) return

    const col = new Collection({
      name: 'excecoes_qualificacao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: null,
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
        { name: 'motivo', type: 'text', required: true, max: 1000 },
        { name: 'validade', type: 'date', required: true },
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
      indexes: ['CREATE INDEX idx_excecao_negocio ON excecoes_qualificacao (negocio)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('excecoes_qualificacao'))
    } catch (_) {}
  },
)
