// T3.17 — limpeza das provas: os contratos v1–v5 gerados contra a Felicidade Collective
// são fixtures de prova/teste humano (nenhum contrato real foi enviado). A base volta a
// 0 contratos; o negócio, a empresa e a auditoria permanecem intactos (append-only da
// auditoria preserva a trilha das provas).

migrate(
  (app) => {
    var recs = app.findRecordsByFilter('contratos', '', '', 500, 0)
    var n = 0
    for (var i = 0; i < recs.length; i++) {
      app.delete(recs[i])
      n++
    }
    $app.logger().info('T317 limpeza provas', 'removidos', n)
  },
  (app) => {},
)
