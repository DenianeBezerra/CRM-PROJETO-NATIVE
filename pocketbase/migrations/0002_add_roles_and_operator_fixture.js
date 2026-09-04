migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'operator'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }

    const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
    admin.set('role', 'admin')
    app.save(admin)

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br')
    } catch (_) {
      const operator = new Record(users)
      operator.setEmail('operador.demo@vibratto.com.br')
      operator.setPassword('Operador@Pass')
      operator.setVerified(true)
      operator.set('name', 'Operador Demo')
      operator.set('role', 'operator')
      app.save(operator)
    }
  },
  (app) => {
    try {
      const operator = app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br')
      app.delete(operator)
    } catch (_) {}

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
      app.save(users)
    }
  },
)
