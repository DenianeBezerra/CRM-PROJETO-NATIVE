// T3.02b — regra server-side da ficha (v11): motivo_atualizacao obrigatório no
// CREATE (request hook, provado) e no UPDATE (API rule da coleção).
// Gramática PB: sem length() — usa comparação de string: motivo não vazio e
// sem espaços apenas (trim aproximado via ~ padrão não disponível).
// Solução: motivo >= 10 chars é validado por padrão de 10 caracteres não-espço
// via LIKE? Não suportado. Alternativa robusta: campo obrigatório no UPDATE
// via @request.body.motivo_atualizacao != '' (presença) + hook JSVM valida o
// comprimento com leitura do banco (request hook, fonte da verdade).
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('fichas_proposta')
    col.updateRule = "@request.auth.id != '' && @request.body.motivo_atualizacao != ''"
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
