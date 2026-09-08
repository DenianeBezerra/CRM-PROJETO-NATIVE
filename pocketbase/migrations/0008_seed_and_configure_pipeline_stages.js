migrate(
  (app) => {
    if (app.hasTable('etapas_negocio')) return

    const etapas = new Collection({
      name: 'etapas_negocio',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
      fields: [
        { name: 'chave', type: 'text', required: true, max: 80 },
        { name: 'nome', type: 'text', required: true, max: 120 },
        { name: 'ordem', type: 'number', required: true },
        { name: 'ativa', type: 'bool' },
        { name: 'sistema', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_etapas_negocio_chave ON etapas_negocio (chave)'],
    })
    app.save(etapas)

    const seed = [
      ['novo', 'Novo', 10, true, true],
      ['contato_feito', 'Contato feito', 20, true, true],
      ['proposta', 'Proposta', 30, true, true],
      ['fechado_ganho', 'Fechado ganho', 40, true, true],
      ['fechado_perdido', 'Fechado perdido', 50, true, true],
    ]
    for (const [chave, nome, ordem, ativa, sistema] of seed) {
      const record = new Record(etapas)
      record.set('chave', chave)
      record.set('nome', nome)
      record.set('ordem', ordem)
      record.set('ativa', ativa)
      record.set('sistema', sistema)
      app.save(record)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('etapas_negocio'))
    } catch (_) {}
  },
)
