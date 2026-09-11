migrate(
  (app) => {
    // T2.27 — CA-2-022: tarefa vinculada à oportunidade.
    // Operador cria, atribui (responsável), prioriza e conclui com resultado
    // obrigatório. Delete bloqueado (histórico operacional preservado).
    if (app.hasTable('tarefas')) return

    const col = new Collection({
      name: 'tarefas',
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
        { name: 'titulo', type: 'text', required: true, min: 3, max: 200 },
        { name: 'descricao', type: 'text', max: 5000 },
        {
          name: 'responsavel',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'prioridade',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['baixa', 'media', 'alta'],
        },
        { name: 'prazo', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['aberta', 'concluida'],
        },
        { name: 'resultado', type: 'text', max: 5000 },
        { name: 'concluida_em', type: 'date' },
        { name: 'concluida_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
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
      indexes: ['CREATE INDEX idx_tarefas_negocio ON tarefas (negocio)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('tarefas'))
    } catch (_) {}
  },
)
