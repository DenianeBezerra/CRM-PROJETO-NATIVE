migrate(
  (app) => {
    // T2.37 — CA-2-032: baselines de métricas (SPEC-2-007).
    // Append-only: delete bloqueado; versão sequencial server-side por período;
    // re-execução cria nova versão, nunca sobrescreve.
    if (app.hasTable('baselines')) return

    const col = new Collection({
      name: 'baselines',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'periodo_inicio', type: 'date', required: true },
        { name: 'periodo_fim', type: 'date', required: true },
        { name: 'versao', type: 'number', required: true },
        { name: 'metricas', type: 'json' },
        { name: 'fuso', type: 'text', required: true, max: 100 },
        { name: 'fonte_endpoint', type: 'text', max: 500 },
        { name: 'calculado_por', type: 'text', max: 500 },
        { name: 'reproduzivel', type: 'bool' },
        { name: 'criado_em', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_baseline_periodo_versao ON baselines (periodo_inicio, periodo_fim, versao)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('baselines'))
    } catch (_) {}
  },
)
