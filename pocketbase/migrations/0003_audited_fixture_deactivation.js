migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('active')) {
      users.fields.add(new BoolField({ name: 'active' }))
    }
    if (!users.fields.getByName('demo_fixture')) {
      users.fields.add(new BoolField({ name: 'demo_fixture' }))
    }
    if (!users.fields.getByName('deactivated_at')) {
      users.fields.add(new DateField({ name: 'deactivated_at' }))
    }
    if (!users.fields.getByName('deactivated_by')) {
      users.fields.add(
        new RelationField({
          name: 'deactivated_by',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    app.save(users)

    const demo = app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br')
    demo.set('active', true)
    demo.set('demo_fixture', true)
    app.save(demo)

    const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
    admin.set('active', true)
    admin.set('demo_fixture', true)
    app.save(admin)

    if (!app.hasTable('fixture_audit')) {
      const audit = new Collection({
        name: 'fixture_audit',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'fixture_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
            required: true,
          },
          { name: 'action', type: 'select', values: ['deactivated'], maxSelect: 1, required: true },
          {
            name: 'actor_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
            required: true,
          },
          { name: 'occurred_at', type: 'date', required: true },
          { name: 'reason', type: 'text', required: true, max: 255 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(audit)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fixture_audit'))
    } catch (_) {}
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    for (const field of ['deactivated_by', 'deactivated_at', 'demo_fixture', 'active']) {
      if (users.fields.getByName(field)) users.fields.removeByName(field)
    }
    app.save(users)
  },
)
