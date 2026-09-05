migrate(
  (app) => {
    // 1. Deletar coleção fixture_audit se existir
    try {
      const audit = app.findCollectionByNameOrId('fixture_audit')
      app.delete(audit)
    } catch (_) {}

    // 2. Deletar usuário operador.demo@vibratto.com.br se existir
    try {
      const operator = app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br')
      app.delete(operator)
    } catch (_) {}

    // 3. Limpar campos de fixtures e role na coleção users
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const fieldsToRemove = ['deactivated_by', 'deactivated_at', 'demo_fixture', 'active', 'role']
    let needsSave = false

    for (const fieldName of fieldsToRemove) {
      if (users.fields.getByName(fieldName)) {
        users.fields.removeByName(fieldName)
        needsSave = true
      }
    }

    if (needsSave) {
      app.save(users)
    }

    // 4. Garantir que deniane@vibratto.com.br exista, verificado, com nome Deniane e senha Skip@Pass
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      admin.setVerified(true)
      admin.set('name', 'Deniane')
      admin.setPassword('Skip@Pass')
      app.save(admin)
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('deniane@vibratto.com.br')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Deniane')
      app.save(admin)
    }
  },
  () => {},
)
