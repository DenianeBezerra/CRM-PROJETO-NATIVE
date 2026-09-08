migrate(
  (app) => {
    // 1. Remove fixture_audit collection if exists
    try {
      const auditCol = app.findCollectionByNameOrId('fixture_audit')
      app.delete(auditCol)
    } catch (_) {
      // already removed or not found
    }

    // 2. Clean users collection: remove demo_fixture, deactivated_at, deactivated_by fields
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const fieldsToRemove = ['demo_fixture', 'deactivated_at', 'deactivated_by']
    let modified = false

    for (const fieldName of fieldsToRemove) {
      if (users.fields.getByName(fieldName)) {
        users.fields.removeByName(fieldName)
        modified = true
      }
    }

    if (modified) {
      app.save(users)
    }

    // 3. Ensure deniane@vibratto.com.br exists as active admin with password Skip@Pass
    try {
      const deniane = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      deniane.setPassword('Skip@Pass')
      deniane.setVerified(true)
      deniane.set('name', 'Deniane')
      deniane.set('role', 'admin')
      deniane.set('active', true)
      app.save(deniane)
    } catch (_) {
      const deniane = new Record(users)
      deniane.setEmail('deniane@vibratto.com.br')
      deniane.setPassword('Skip@Pass')
      deniane.setVerified(true)
      deniane.set('name', 'Deniane')
      deniane.set('role', 'admin')
      deniane.set('active', true)
      app.save(deniane)
    }
  },
  (app) => {
    // Revert is a no-op as demo machinery is permanently deprecated
  },
)
