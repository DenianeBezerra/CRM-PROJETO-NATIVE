// T3.08 — limpeza das fixtures de prova (padrão 0150–0154).
// Remove: tarefas/comentários/notificações de prova e usuário operator de prova.
// Delete via migration não remove registros (lição T3.02) — SQL direto.
migrate(
  (app) => {
    app.db().newQuery("DELETE FROM tarefas WHERE titulo LIKE 'Prova T3.08%'").execute()
    app.db().newQuery("DELETE FROM comentarios WHERE texto LIKE 'Prova T3.08%'").execute()
    app
      .db()
      .newQuery(
        "DELETE FROM notificacoes WHERE usuario IN (SELECT id FROM users WHERE email LIKE 'prova-t308%')",
      )
      .execute()
    app.db().newQuery("DELETE FROM users WHERE email LIKE 'prova-t308%'").execute()
  },
  (app) => {},
)
