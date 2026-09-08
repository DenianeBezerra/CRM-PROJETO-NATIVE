migrate(
  (app) => {
    if (app.hasTable('demo_fixtures')) return

    const fixtures = new Collection({
      name: 'demo_fixtures',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'fixture_key', type: 'text', required: true, max: 100 },
        { name: 'label', type: 'text', required: true, max: 255 },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'deactivated'],
          maxSelect: 1,
          required: true,
        },
        { name: 'environment', type: 'select', values: ['demo'], maxSelect: 1, required: true },
        { name: 'deactivated_at', type: 'date' },
        { name: 'deactivated_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_demo_fixtures_key ON demo_fixtures (fixture_key)'],
    })
    app.save(fixtures)

    const audit = new Collection({
      name: 'fixture_audit',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'fixture_id',
          type: 'relation',
          collectionId: fixtures.id,
          required: true,
          maxSelect: 1,
        },
        { name: 'action', type: 'select', values: ['deactivated'], maxSelect: 1, required: true },
        {
          name: 'actor_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'occurred_at', type: 'date', required: true },
        { name: 'reason', type: 'text', required: true, max: 255 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(audit)

    const fixture = new Record(fixtures)
    fixture.set('fixture_key', 'operator-demo-catalog')
    fixture.set('label', 'Catálogo de fixture do operador de demonstração')
    fixture.set('status', 'active')
    fixture.set('environment', 'demo')
    app.save(fixture)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fixture_audit'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('demo_fixtures'))
    } catch (_) {}
  },
)
