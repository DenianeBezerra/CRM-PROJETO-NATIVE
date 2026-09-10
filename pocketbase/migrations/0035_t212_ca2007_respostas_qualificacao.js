migrate(
  (app) => {
    // T2.12 — CA-2-007: operador salva qualificação válida e visualiza
    // percentual e pendências de completude. Respostas vinculadas a negócio
    // e pergunta; unicidade por par (negocio + pergunta).
    if (app.hasTable('respostas_qualificacao')) return

    const col = new Collection({
      name: 'respostas_qualificacao',
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
        {
          name: 'pergunta',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('perguntas_qualificacao').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'resposta_texto', type: 'text', max: 2000 },
        { name: 'resposta_numero', type: 'number' },
        { name: 'resposta_bool', type: 'bool' },
        { name: 'respondido_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'respondido_em', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_resposta_negocio_pergunta ON respostas_qualificacao (negocio, pergunta)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('respostas_qualificacao'))
    } catch (_) {}
  },
)
