// T3.17 — limpeza FINAL das fixtures de prova (execução 2).
// A migration 0182 anterior rodou ANTES das provas finais GREEN (que recriaram
// versões 3–5 por API). Esta execução remove TODOS os contratos de teste —
// a base deve ficar com 0 contratos; os contratos reais serão criados pela CEO
// na UI. Idempotente e seguro: coleção dedicada de prova, sem dados reais.

migrate(
  (app) => {
    var recs = app.findRecordsByFilter('contratos', '', '', 500, 0)
    var n = 0
    for (var i = 0; i < recs.length; i++) {
      try {
        app.delete(recs[i])
        n++
      } catch (_) {}
    }
    $app.logger().info('T317 limpeza fixtures final', 'removidos', String(n))
  },
  (app) => {},
)
