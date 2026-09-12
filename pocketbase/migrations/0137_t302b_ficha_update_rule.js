// T3.02b — regra server-side da ficha (v10): motivo_atualizacao obrigatório no
// CREATE (request hook, provado) e no UPDATE (API rule da coleção).
// Gramática PB: length() é função, não propriedade.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('fichas_proposta')
    col.updateRule = "@request.auth.id != '' && " + 'length(@request.body.motivo_atualizacao) >= 10'
    app.save(col)
  },
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('fichas_proposta')
      col.updateRule = "@request.auth.id != ''"
      app.save(col)
    } catch (_) {}
  },
)
