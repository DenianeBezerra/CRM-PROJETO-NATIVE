// T3.16 — SPEC-3-016: RBAC parcial (cap. 8/D12).
// users.role ganha 'coordenacao' e 'comercial'.
// Regras de coleção operacionais: comercial perde acesso direto às coleções
// (fichas_operacionais, obrigacoes, excecoes, implantacoes, implantacao_etapas,
// ficha_canais, ficha_bancos, ficha_pessoas, ficha_versions) — leitura/escrita
// exigem role != 'comercial'. A separação é por permissão, nunca por base distinta.

migrate(
  (app) => {
    var users = app.findCollectionByNameOrId('users')
    var campoRole = users.fields.getByName('role')
    var vals = campoRole.values || []
    var novos = ['coordenacao', 'comercial']
    for (var i = 0; i < novos.length; i++) {
      if (vals.indexOf(novos[i]) < 0) vals.push(novos[i])
    }
    campoRole.values = vals
    app.save(users)

    var colecoes = [
      'fichas_operacionais',
      'obrigacoes',
      'excecoes',
      'implantacoes',
      'implantacao_etapas',
      'ficha_canais',
      'ficha_bancos',
      'ficha_pessoas',
      'ficha_versions',
    ]
    for (var c = 0; c < colecoes.length; c++) {
      var col = app.findCollectionByNameOrId(colecoes[c])
      var regra = "@request.auth.id != '' && @request.auth.role != 'comercial'"
      col.listRule = regra
      col.viewRule = regra
      if (colecoes[c] === 'fichas_operacionais') {
        // create admin-only já existia; update mantém auth e veta comercial
        col.updateRule = "@request.auth.id != '' && @request.auth.role != 'comercial'"
      } else if (col.updateRule && String(col.updateRule).indexOf('comercial') < 0) {
        col.updateRule = "@request.auth.id != '' && @request.auth.role != 'comercial'"
      }
      app.save(col)
    }
  },
  (app) => {
    var users = app.findCollectionByNameOrId('users')
    var campoRole = users.fields.getByName('role')
    var vals = campoRole.values || []
    var remover = ['coordenacao', 'comercial']
    for (var i = 0; i < remover.length; i++) {
      var ix = vals.indexOf(remover[i])
      if (ix >= 0) {
        vals.splice(ix, 1)
      }
    }
    campoRole.values = vals
    app.save(users)
    // regras de coleção não são revertidas (voltam ao estado anterior na próxima execução do par)
  },
)
