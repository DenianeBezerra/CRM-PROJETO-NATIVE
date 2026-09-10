migrate(
  (app) => {
    // T2.01 — CA-2-036: campos comerciais canônicos da Fase 1 em negocios,
    // backfill de data_entrada e valor 'delete' na trilha de auditoria.
    const negocios = app.findCollectionByNameOrId('negocios')
    const fields = [
      {
        name: 'origem',
        type: 'select',
        values: ['indicacao', 'site', 'redes_sociais', 'evento', 'outro'],
        maxSelect: 1,
      },
      { name: 'tags', type: 'text', max: 500 },
      {
        name: 'responsavel',
        type: 'relation',
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
      },
      { name: 'prioridade', type: 'select', values: ['baixa', 'media', 'alta'], maxSelect: 1 },
      { name: 'score', type: 'number', min: 0, max: 100 },
      {
        name: 'servico',
        type: 'select',
        values: ['bpo_financeiro', 'controladoria', 'cfo_as_a_service', 'outro'],
        maxSelect: 1,
      },
      {
        name: 'status',
        type: 'select',
        values: ['em_aberto', 'em_negociacao', 'pausado', 'ganho', 'perdido'],
        maxSelect: 1,
      },
      { name: 'data_entrada', type: 'date' },
    ]
    for (const field of fields) {
      try {
        negocios.fields.add(new Field(field))
      } catch (_) {
        /* idempotente */
      }
    }
    app.save(negocios)

    // Backfill: data_entrada = created para registros existentes (sem estado parcial).
    const existing = app.findRecordsByFilter(negocios, '', '-created', 20000, 0)
    for (const deal of existing) {
      const entrada = String(deal.get('data_entrada') || '')
      if (!entrada || entrada.startsWith('0001-01-01')) {
        deal.set('data_entrada', deal.get('created'))
        app.save(deal)
      }
    }

    // Auditoria passa a registrar também exclusões.
    const auditoria = app.findCollectionByNameOrId('auditoria')
    const acaoField = auditoria.fields.getByName('acao')
    if (acaoField && !acaoField.values.includes('delete')) {
      acaoField.values.push('delete')
      app.save(auditoria)
    }
  },
  (app) => {
    // Rollback: remove os campos adicionados (histórico de auditoria é append-only).
    try {
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
        } catch (_) {}
      }
      app.save(negocios)
    } catch (_) {}
    try {
      const auditoria = app.findCollectionByNameOrId('auditoria')
      const acaoField = auditoria.fields.getByName('acao')
      if (acaoField) {
        acaoField.values = acaoField.values.filter((v) => v !== 'delete')
        app.save(auditoria)
      }
    } catch (_) {}
  },
)
