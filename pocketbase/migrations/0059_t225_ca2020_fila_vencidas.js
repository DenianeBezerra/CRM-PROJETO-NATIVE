migrate(
  (app) => {
    // T2.25 — CA-2-020: fila de propostas vencidas.
    // O cron (08:00 America/Sao_Paulo) registra um evento por proposta/dia.
    // Append-only: o registro da fila nunca é editado nem apagado pela API.
    if (app.hasTable('fila_propostas_vencidas')) return

    const col = new Collection({
      name: 'fila_propostas_vencidas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'proposta',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('propostas').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'negocio',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('negocios').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'responsavel',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'versao_proposta', type: 'number', onlyInt: true },
        { name: 'valor', type: 'number' },
        { name: 'validade', type: 'date' },
        { name: 'dia_referencia', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_fila_pv_unica ON fila_propostas_vencidas (proposta, dia_referencia)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fila_propostas_vencidas'))
    } catch (_) {}
  },
)
