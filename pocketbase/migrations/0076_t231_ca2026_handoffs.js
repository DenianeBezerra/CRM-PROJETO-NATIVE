migrate(
  (app) => {
    // T2.31 — CA-2-026: handoff de ganho.
    // Nasce do evento de ganho (server-side, idempotente) — a API não cria
    // nem edita (createRule/updateRule null). Decisão humana (aceite/devolução)
    // é a T2.33; aqui o handoff nasce com checklist padrão do onboarding.
    if (app.hasTable('handoffs')) return

    const col = new Collection({
      name: 'handoffs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
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
        {
          name: 'origem',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['bpo_financeiro', 'controladoria', 'cfo_as_a_service', 'outro'],
        },
        {
          name: 'responsavel_emissor',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'responsavel_receptor',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'aceito', 'devolvido'],
        },
        { name: 'checklist', type: 'json' },
        { name: 'observacao_ganho', type: 'text', max: 5000 },
        { name: 'criado_em', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_handoff_negocio ON handoffs (negocio)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('handoffs'))
    } catch (_) {}
  },
)
