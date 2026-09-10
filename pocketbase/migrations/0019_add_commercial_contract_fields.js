migrate(
  (app) => {
    // T2.01 / CA-2-036 — completa o contrato canônico de oportunidades (SPEC-1-004)
    // com os 8 campos comerciais pendentes: origem, tags, responsavel, prioridade,
    // score, servico, status e data_entrada. Vocabulário idêntico ao do frontend
    // (Opportunities.tsx). Migration aditiva e reversível.
    const negocios = app.findCollectionByNameOrId('negocios')

    const fields = [
      {
        name: 'origem',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['indicacao', 'site', 'redes_sociais', 'evento', 'outro'],
      },
      { name: 'tags', type: 'text', required: false, max: 500 },
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
        values: ['baixa', 'media', 'alta'],
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
        values: ['bpo_financeiro', 'controladoria', 'cfo_as_a_service', 'outro'],
      },
      {
        name: 'status',
        type: 'select',
        required: false,
        maxSelect: 1,
        values: ['em_aberto', 'em_negociacao', 'pausado', 'ganho', 'perdido'],
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

    // Retrocompatibilidade: registros anteriores recebem data_entrada = created.
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
