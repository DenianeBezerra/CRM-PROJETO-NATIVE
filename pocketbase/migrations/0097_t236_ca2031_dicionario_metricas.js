migrate(
  (app) => {
    // T2.36 — CA-2-031: dicionário de métricas (SPEC-2-007).
    // Append-only: create/update admin-only, delete bloqueado. Cada métrica
    // registra fórmula, fonte, evento inicial/final, fuso, exclusões e dono.
    if (app.hasTable('dicionario_metricas')) return

    const col = new Collection({
      name: 'dicionario_metricas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
      fields: [
        { name: 'chave', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'formula', type: 'text', required: true, max: 5000 },
        { name: 'fonte', type: 'text', required: true, max: 2000 },
        { name: 'evento_inicial', type: 'text', required: true, max: 2000 },
        { name: 'evento_final', type: 'text', required: true, max: 2000 },
        { name: 'fuso', type: 'text', required: true, max: 100 },
        { name: 'exclusoes', type: 'text', required: true, max: 5000 },
        { name: 'dono', type: 'text', required: true, max: 500 },
        { name: 'endpoint', type: 'text', max: 500 },
        { name: 'ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_dicionario_chave ON dicionario_metricas (chave)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('dicionario_metricas'))
    } catch (_) {}
  },
)
