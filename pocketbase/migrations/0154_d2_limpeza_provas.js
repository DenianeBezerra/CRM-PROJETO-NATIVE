// T3.07/D2+D5 — limpeza das fixtures de prova (padrão 0150–0152).
// Delete via migration não remove registros (lição T3.02) — invalidação por
// SQL direto (mesmo mecanismo usado para retroagir o created da fixture D5).
migrate(
  (app) => {
    app.db().newQuery("DELETE FROM leads_entrada WHERE email LIKE 'prova-d2-%'").execute()
  },
  (app) => {},
)
