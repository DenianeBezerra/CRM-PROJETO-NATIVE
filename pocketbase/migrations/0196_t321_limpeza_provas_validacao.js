// T3.21 — Limpeza das provas da validação da CEO (16/09): peças de teste e
// campanha de teste criadas para validar slug D17 automático e estado terminal.
// Delete via API é bloqueado (append-only) — limpeza por migration.
migrate(
  (app) => {
    var ids = ['jgqj9r1ctgvulpl', '1rigm70j6h6skoo']
    for (var i = 0; i < ids.length; i++) {
      try {
        var r = app.findRecordById('conteudos', ids[i])
        r.set('status', 'arquivado')
        r.set('titulo_interno', '[PROVA T3.21] ' + String(r.get('titulo_interno') || ''))
        app.save(r)
        app.logger().info('T321 limpeza conteudo prova arquivado', 'id', ids[i])
      } catch (_) {}
    }
    try {
      var camp = app.findRecordById('campanhas', 'x09g1ic135b0y4w')
      camp.set('nome', '[PROVA T3.21] Prova Validacao CEO')
      camp.set('status', 'encerrada')
      app.save(camp)
      app.logger().info('T321 limpeza campanha prova encerrada')
    } catch (_) {}
  },
  (app) => {},
)
