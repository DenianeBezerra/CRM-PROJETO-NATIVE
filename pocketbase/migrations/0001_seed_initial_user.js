migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      return // already seeded
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('deniane@vibratto.com.br')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Deniane')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      app.delete(record)
    } catch (_) {}
  },
)
