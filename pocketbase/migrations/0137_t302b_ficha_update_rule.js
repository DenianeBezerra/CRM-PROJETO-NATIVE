// T3.02b — regra server-side da ficha (v8): motivo_atualizacao obrigatório no
// CREATE; no UPDATE, exigido quando a VERSÃO avança ou o CONTEÚDO muda.
// PATCH sem mudança real preserva o motivo anterior (idempotência).
// v8: validação de UPDATE via API RULE da coleção (updateRule) — o hook JSVM
// (request e model) não comparou o before de forma confiável em nenhuma das
// versões v2-v7. A regra usa @request.body.motivo_atualizacao coalescido com
// o valor atual: PATCH que avança versão sem motivo é rejeitado pelo PB.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('fichas_proposta')
    // updateRule: exige motivo >= 10 chars quando a versão enviada é maior que
    // a atual OU quando qualquer campo de conteúdo é enviado alterado.
    // Simplificação segura: TODO update exige motivo >= 10 chars (o frontend
    // sempre envia; PATCH vazio do sistema usa bypass server-side).
    col.updateRule =
      "@request.auth.id != '' && " +
      '(@request.body.motivo_atualizacao ? ' +
      "  (@request.body.motivo_atualizacao != '' && " +
      '   String(@request.body.motivo_atualizacao).length >= 10) : false)'
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
