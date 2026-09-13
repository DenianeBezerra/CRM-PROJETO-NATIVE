// T3.21 — Limpeza das provas dos ajustes 1+2 (CEO 16/09): peça "Prova slug
// D17 v2" arquivada/marcada e campanha de prova encerrada.
migrate(
  (app) => {
    try {
      var r = app.findRecordById('conteudos', 'wcbpjkb5vype7z3')
      r.set('status', 'arquivado')
      r.set('titulo_interno', '[PROVA T3.21] Prova slug D17 v2')
      app.save(r)
      app.logger().info('T321 limpeza peça prova slug arquivada')
    } catch (_) {}
    var camps = app.findRecordsByFilter('campanhas', "identificador ~ 'prova-slug'", '', 10, 0)
    for (var i = 0; i < camps.length; i++) {
      camps[i].set('nome', '[PROVA T3.21] Prova slug D17 v2')
      camps[i].set('status', 'encerrada')
      app.save(camps[i])
      app.logger().info('T321 limpeza campanha prova-slug encerrada')
    }
  },
  (app) => {},
)
