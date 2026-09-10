migrate(
  (app) => {
    // T2.11 — CA-2-006: administrador configura perguntas, obrigatoriedade,
    // ordem e aplicabilidade de qualificação SEM código.
    // Coleção configurável; regra humana de qualificação permanece fixture
    // (ativação real reservada à consultora/cliente — dependência da fase).
    if (app.hasTable('perguntas_qualificacao')) return

    const col = new Collection({
      name: 'perguntas_qualificacao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
      fields: [
        { name: 'texto', type: 'text', required: true, max: 500 },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['texto_livre', 'numero', 'sim_nao', 'escolha_unica'],
          maxSelect: 1,
        },
        { name: 'opcoes', type: 'text', max: 1000 },
        { name: 'obrigatoria', type: 'bool' },
        { name: 'ordem', type: 'number', required: true },
        {
          name: 'aplicavel_a',
          type: 'select',
          required: true,
          values: ['todas', 'novo', 'contato_feito', 'proposta'],
          maxSelect: 1,
        },
        { name: 'ativa', type: 'bool' },
        { name: 'sistema', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_perguntas_qualificacao_ordem ON perguntas_qualificacao (ordem)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('perguntas_qualificacao'))
    } catch (_) {}
  },
)
