migrate(
  (app) => {
    // T2.01 / CA-2-036 — completa o contrato canônico de oportunidades (SPEC-1-004)
    // com os 8 campos comerciais pendentes: origem, tags, responsavel, prioridade,
    // score, servico, status e data_entrada. Migration aditiva e reversível.
    const negocios = app.findCollectionByNameOrId('negocios')

    const fields = [
      {
        name: 'origem',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['site', 'indicacao', 'redes_sociais', 'evento', 'outbound', 'outro'],
      },
      {
        name: 'tags',
        type: 'select',
        required: false,
        maxSelect: 10,
        values: [
          'bpo_financeiro',
          'controladoria',
          'cfo_as_a_service',
          'mentoria',
          'recorrente',
          'projeto',
          'estrategico',
          'urgente',
        ],
      },
      {
        name: 'responsavel',
        type: 'relation',
        required: false,
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: 'prioridade',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['baixa', 'media', 'alta', 'critica'],
      },
      {
        name: 'score',
        type: 'number',
        required: false,
        min: 0,
        max: 100,
      },
      {
        name: 'servico',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: [
          'bpo_financeiro',
          'controladoria',
          'cfo_as_a_service',
          'mentoria',
          'consultoria',
          'outro',
        ],
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['em_qualificacao', 'em_negociacao', 'proposta_enviada', 'em_garantia', 'suspenso'],
      },
      {
        name: 'data_entrada',
        type: 'date',
        required: false,
      },
    ]

    for (const field of fields) {
      if (!negocios.fields.getByName(field.name)) {
        negocios.fields.add(new Field(field))
      }
    }
    app.save(negocios)

    // Retrocompatibilidade: registros criados antes da migração recebem data_entrada
    // = created, para que nenhum registro fique sem a data de entrada auditável.
    const existing = app.findRecordsByFilter(negocios, "data_entrada = ''", '-created', 20000, 0)
    for (const deal of existing) {
      deal.set('data_entrada', deal.get('created'))
      app.save(deal)
    }
  },
  (app) => {
    const negocios = app.findCollectionByNameOrId('negocios')
    for (const name of [
      'origem',
      'tags',
      'responsavel',
      'prioridade',
      'score',
      'servico',
      'status',
      'data_entrada',
    ]) {
      try {
        negocios.fields.removeByName(name)
      } catch (_) {
        /* rollback tolerante */
      }
    }
    app.save(negocios)
  },
)
