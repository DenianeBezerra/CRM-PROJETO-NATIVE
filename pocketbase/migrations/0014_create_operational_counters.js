migrate(
  (app) => {
    // ==========================================
    // 1. Coleção append-only permanencias_negocio
    // ==========================================
    if (!app.hasTable('permanencias_negocio')) {
      const perm = new Collection({
        name: 'permanencias_negocio',
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
          { name: 'etapa', type: 'text', required: true, max: 80 },
          { name: 'entrou_em', type: 'date', required: true },
          { name: 'saiu_em', type: 'date' },
          { name: 'duracao_segundos', type: 'number', min: 0 },
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_perm_negocio ON permanencias_negocio (negocio)',
          'CREATE INDEX idx_perm_negocio_aberta ON permanencias_negocio (negocio, saiu_em)',
          'CREATE INDEX idx_perm_etapa ON permanencias_negocio (etapa)',
        ],
      })
      app.save(perm)
    }

    // ==========================================
    // 2. Coleção administrativa configuracoes_operacionais
    // ==========================================
    if (!app.hasTable('configuracoes_operacionais')) {
      const config = new Collection({
        name: 'configuracoes_operacionais',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'chave', type: 'text', required: true, max: 120 },
          { name: 'valor_numero', type: 'number', min: 0 },
          { name: 'descricao', type: 'text', max: 500 },
          {
            name: 'updated_by',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_config_operacional_chave ON configuracoes_operacionais (chave)',
        ],
      })
      app.save(config)
    }

    // Seed obrigatório
    const configs = app.findCollectionByNameOrId('configuracoes_operacionais')
    const existing = app.findRecordsByFilter(
      configs,
      "chave = 'limite_oportunidade_parada_dias'",
      '',
      1,
      0,
    )
    if (existing.length === 0) {
      const seed = new Record(configs)
      seed.set('chave', 'limite_oportunidade_parada_dias')
      seed.set('valor_numero', 10)
      seed.set(
        'descricao',
        'Limite em dias para uma oportunidade ser considerada parada na etapa atual.',
      )
      app.save(seed)
    }

    // ==========================================
    // 3. Campos em negocios
    // ==========================================
    const negocios = app.findCollectionByNameOrId('negocios')
    const fields = [
      { name: 'proxima_acao_em', type: 'date' },
      { name: 'proxima_acao_descricao', type: 'text', max: 500 },
      { name: 'arquivado', type: 'bool' },
    ]
    for (const field of fields) {
      try {
        negocios.fields.add(new Field(field))
      } catch (_) {
        /* idempotente */
      }
    }
    app.save(negocios)
  },
  (app) => {
    // Rollback tolerante: campos de negocios
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      for (const name of ['proxima_acao_em', 'proxima_acao_descricao', 'arquivado']) {
        try {
          negocios.fields.removeByName(name)
        } catch (_) {}
      }
      app.save(negocios)
    } catch (_) {}

    // Rollback: coleções
    try {
      app.delete(app.findCollectionByNameOrId('configuracoes_operacionais'))
    } catch (_) {}
    // Histórico é append-only; rollback não apaga permanências registradas.
  },
)
