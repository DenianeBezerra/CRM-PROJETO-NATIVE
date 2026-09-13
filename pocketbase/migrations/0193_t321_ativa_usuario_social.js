// T3.21 — Correção do usuário de prova social_media: o registro já existia
// (criado antes via API com active=false — o guard T2.07 bloqueia o login
// com mensagem genérica). Esta migration ATIVA o usuário existente, garante
// a senha e remove o segundo registro de prova duplicado.
migrate(
  (app) => {
    var alvo = 't321_prova_social@vibratto.com.br'
    var rec = app.findAuthRecordByEmail('_pb_users_auth_', alvo)
    rec.set('active', true)
    rec.setVerified(true)
    rec.setPassword('ProvaT321!Social')
    rec.set('role', 'social_media')
    rec.set('name', 'Prova T321 Social')
    app.save(rec)
    app.logger().info('T321 RBAC usuario social ativado', 'id', rec.id)

    // Remove duplicado de prova criado via API (email diferente).
    try {
      var dup = app.findAuthRecordByEmail('_pb_users_auth_', 't321_prova_social2@vibratto.com.br')
      app.delete(dup)
      app.logger().info('T321 RBAC duplicado removido', 'id', dup.id)
    } catch (_) {}
  },
  (app) => {},
)
