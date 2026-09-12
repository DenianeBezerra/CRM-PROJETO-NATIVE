// T3.11 — limpeza das fixtures de prova (padrão).
// Remove a ficha de prova, listas e operator de teste. Fichas REAIS criadas
// pela CEO no teste humano NÃO são afetadas (a limpeza roda antes do teste).
migrate(
  (app) => {
    app.db().newQuery('DELETE FROM ficha_versions').execute()
    app.db().newQuery('DELETE FROM ficha_pessoas').execute()
    app.db().newQuery('DELETE FROM ficha_bancos').execute()
    app.db().newQuery('DELETE FROM ficha_canais').execute()
    app.db().newQuery('DELETE FROM fichas_operacionais').execute()
    app.db().newQuery("DELETE FROM users WHERE email LIKE 'prova-t311%'").execute()
  },
  (app) => {},
)
