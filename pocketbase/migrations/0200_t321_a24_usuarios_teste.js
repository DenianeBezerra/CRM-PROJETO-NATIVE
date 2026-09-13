// T3.21/A-24 (CEO 16/09): usuários de teste para conferência por perfil.
// Analista (role operator) e social media — ativos, com senha conhecida.
// A conferência usa login real + acesso direto a URLs (não só código).
migrate(
  (app) => {
    var users = app.findCollectionByNameOrId('_pb_users_auth_')
    var criar = function (email, nome, role, senha) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.logger().info('A24 usuario ja existe', email)
      } catch (_) {
        var rec = new Record(users)
        rec.setEmail(email)
        rec.setPassword(senha)
        rec.setVerified(true)
        rec.set('name', nome)
        rec.set('role', role)
        rec.set('active', true)
        app.save(rec)
        app.logger().info('A24 usuario criado', email, role)
      }
    }
    criar('analista_teste@vibratto.com.br', 'Analista (teste A24)', 'operator', 'A24Teste!Analista')
    criar(
      'social_teste@vibratto.com.br',
      'Social Media (teste A24)',
      'social_media',
      'A24Teste!Social',
    )
  },
  (app) => {
    try {
      var a = app.findAuthRecordByEmail('_pb_users_auth_', 'analista_teste@vibratto.com.br')
      app.delete(a)
    } catch (_) {}
    try {
      var s = app.findAuthRecordByEmail('_pb_users_auth_', 'social_teste@vibratto.com.br')
      app.delete(s)
    } catch (_) {}
  },
)
