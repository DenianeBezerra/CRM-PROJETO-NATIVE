// T3.02b — regra server-side da ficha (v9): motivo_atualizacao obrigatório no
// CREATE (request hook, provado) e no UPDATE (API rule da coleção — os hooks
// JSVM não expõem o before confiável, lição v2-v8). Gramática PB: sem ternário;
// String() e length são suportados em expressões de regra.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('fichas_proposta')
    col.updateRule =
      "@request.auth.id != '' && " + 'String(@request.body.motivo_atualizacao).length >= 10'
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
