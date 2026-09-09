migrate(
  (app) => {
    const negocios = app.findCollectionByNameOrId('negocios')
    const fields = [
      {
        name: 'motivo_perda',
        type: 'select',
        values: ['preco', 'concorrencia', 'sem_orcamento', 'timing', 'sem_retorno', 'outro'],
        maxSelect: 1,
      },
      { name: 'motivo_perda_detalhe', type: 'text', max: 500 },
      { name: 'data_ganho', type: 'date' },
      { name: 'observacao_ganho', type: 'text', max: 1000 },
      { name: 'justificativa_reabertura', type: 'text', max: 1000 },
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
    const negocios = app.findCollectionByNameOrId('negocios')
    for (const name of [
      'motivo_perda',
      'motivo_perda_detalhe',
      'data_ganho',
      'observacao_ganho',
      'justificativa_reabertura',
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
