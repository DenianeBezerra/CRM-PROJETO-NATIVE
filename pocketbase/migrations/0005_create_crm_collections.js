migrate(
  (app) => {
    // ==========================================
    // 1. Coleção clientes
    // ==========================================
    let clientesCol
    try {
      clientesCol = app.findCollectionByNameOrId('clientes')
    } catch (_) {
      clientesCol = new Collection({
        name: 'clientes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'empresa', type: 'text', required: false },
          { name: 'email', type: 'email', required: false },
          { name: 'telefone', type: 'text', required: false },
          { name: 'cidade', type: 'text', required: false },
          {
            name: 'origem',
            type: 'select',
            required: false,
            values: ['site', 'indicacao', 'redes_sociais', 'evento', 'outro'],
            maxSelect: 1,
          },
          { name: 'observacoes', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['ativo', 'inativo', 'prospect'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_clientes_nome ON clientes (nome)',
          'CREATE INDEX idx_clientes_email ON clientes (email)',
        ],
      })
      app.save(clientesCol)
    }

    const clientesColId = clientesCol.id

    // ==========================================
    // 2. Coleção negocios
    // ==========================================
    let negociosCol
    try {
      negociosCol = app.findCollectionByNameOrId('negocios')
    } catch (_) {
      negociosCol = new Collection({
        name: 'negocios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          {
            name: 'cliente',
            type: 'relation',
            required: true,
            collectionId: clientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'valor', type: 'number', required: false, min: 0 },
          {
            name: 'estagio',
            type: 'select',
            required: false,
            values: ['novo', 'contato_feito', 'proposta', 'fechado_ganho', 'fechado_perdido'],
            maxSelect: 1,
          },
          {
            name: 'probabilidade',
            type: 'number',
            required: false,
            min: 0,
            max: 100,
          },
          { name: 'data_fechamento_previsto', type: 'date', required: false },
          { name: 'observacoes', type: 'text', required: false },
          {
            name: 'criado_por',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_negocios_estagio ON negocios (estagio)',
          'CREATE INDEX idx_negocios_cliente ON negocios (cliente)',
        ],
      })
      app.save(negociosCol)
    }

    const negociosColId = negociosCol.id

    // ==========================================
    // 3. Coleção interacoes
    // ==========================================
    try {
      app.findCollectionByNameOrId('interacoes')
    } catch (_) {
      const interacoesCol = new Collection({
        name: 'interacoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          {
            name: 'cliente',
            type: 'relation',
            required: true,
            collectionId: clientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'negocio',
            type: 'relation',
            required: false,
            collectionId: negociosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['ligacao', 'email', 'reuniao', 'whatsapp', 'outro'],
            maxSelect: 1,
          },
          { name: 'resumo', type: 'text', required: true },
          { name: 'data', type: 'date', required: false },
          {
            name: 'registrado_por',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_interacoes_cliente ON interacoes (cliente)',
          'CREATE INDEX idx_interacoes_data ON interacoes (data)',
        ],
      })
      app.save(interacoesCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('interacoes')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('negocios')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('clientes')
      app.delete(col)
    } catch (_) {}
  },
)
