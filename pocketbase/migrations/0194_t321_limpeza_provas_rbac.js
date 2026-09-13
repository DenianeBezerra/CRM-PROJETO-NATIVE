// T3.21 — Limpeza das fixtures de prova do diagnóstico RBAC (0192/0193):
// remove o usuário social_media de prova. Os creates de conteúdo de prova
// falharam (400 — createRule bloqueia social_media), então não há registros
// órfãos em conteudos.
migrate(
  (app) => {
    try {
      var rec = app.findAuthRecordByEmail('_pb_users_auth_', 't321_prova_social@vibratto.com.br')
      app.delete(rec)
      app.logger().info('T321 RBAC limpeza usuario social removido', 'id', rec.id)
    } catch (_) {}
    try {
      var dup = app.findAuthRecordByEmail('_pb_users_auth_', 't321_prova_social2@vibratto.com.br')
      app.delete(dup)
      app.logger().info('T321 RBAC limpeza duplicado removido', 'id', dup.id)
    } catch (_) {}
  },
  (app) => {},
)
