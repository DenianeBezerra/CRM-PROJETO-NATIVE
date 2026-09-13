// T3.21/A-24 — limpeza dos usuários de teste da conferência por perfil
// (analista_teste e social_teste). Provas concluídas em 13/09.
migrate(
  (app) => {
    var emails = ['analista_teste@vibratto.com.br', 'social_teste@vibratto.com.br']
    for (var i = 0; i < emails.length; i++) {
      try {
        var rec = app.findAuthRecordByEmail('_pb_users_auth_', emails[i])
        app.delete(rec)
        app.logger().info('A24 usuario de teste removido', emails[i])
      } catch (_) {}
    }
  },
  (app) => {},
)
