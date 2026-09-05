migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
    if (users.fields.getByName('active')) admin.set('active', true)
    if (users.fields.getByName('demo_fixture')) admin.set('demo_fixture', false)
    app.save(admin)
  },
  () => {},
)
