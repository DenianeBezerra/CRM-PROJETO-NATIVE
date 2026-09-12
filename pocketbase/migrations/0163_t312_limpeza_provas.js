// T3.12 — limpeza das fixtures de prova (padrão).
// Remove obrigações/exceções geradas nas provas + ficha de prova da AG + usuário inativo.
// A ficha REAL da Felicidade é preservada. O motor será re-executado no teste humano.
migrate(
  (app) => {
    app.db().newQuery('DELETE FROM excecoes').execute()
    app.db().newQuery('DELETE FROM obrigacoes').execute()
    app.db().newQuery("DELETE FROM fichas_operacionais WHERE empresa = 'pg148jskx557y52'").execute()
    app.db().newQuery("DELETE FROM users WHERE email LIKE 'titular-inativo-t312%'").execute()
  },
  (app) => {},
)
