// T3.10 — limpeza das fixtures de prova (padrão).
migrate(
  (app) => {
    app.db().newQuery("DELETE FROM users WHERE email LIKE 'prova-t310%'").execute()
  },
  (app) => {},
)
