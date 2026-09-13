// T3.21 — Investigação da pendência RBAC social_media (0189/0190/0191).
// 1) LOGA as regras atuais das coleções-chave — prova se as migrations
//    anteriores aplicaram as regras no pod.
// 2) Cria usuário de prova social_media (fixture, ativo) para o teste
//    funcional do bloqueio — o caminho provado é migration (a coleção users
//    tem regras self-only e o admin não gerencia outros usuários via API).
migrate(
  (app) => {
    var alvos = ['negocios', 'obrigacoes', 'empresas', 'clientes']
    for (var i = 0; i < alvos.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(alvos[i])
        app
          .logger()
          .info(
            'T321 RBAC diag ' + alvos[i],
            'list',
            String(col.listRule),
            'view',
            String(col.viewRule),
          )
      } catch (err) {
        app.logger().error('T321 RBAC diag falhou ' + alvos[i], String(err))
      }
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 't321_prova_social@vibratto.com.br')
      app.logger().info('T321 RBAC usuario social_media ja existe')
    } catch (_) {
      var users = app.findCollectionByNameOrId('_pb_users_auth_')
      var rec = new Record(users)
      rec.setEmail('t321_prova_social@vibratto.com.br')
      rec.setPassword('ProvaT321!Social')
      rec.setVerified(true)
      rec.set('name', 'Prova T321 Social')
      rec.set('role', 'social_media')
      rec.set('active', true)
      app.save(rec)
      app.logger().info('T321 RBAC usuario social_media criado')
    }
  },
  (app) => {
    try {
      var rec = app.findAuthRecordByEmail('_pb_users_auth_', 't321_prova_social@vibratto.com.br')
      app.delete(rec)
    } catch (_) {}
  },
)
