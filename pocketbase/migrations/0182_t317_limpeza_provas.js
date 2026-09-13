// T3.17 — limpeza das fixtures de prova da T3.17 (2 contratos criados por API durante
// as provas GREEN na oportunidade REAL da Felicidade — 4warv94hav36065).
// A base deve ficar com 0 contratos de prova; os contratos reais serão criados pela CEO
// na UI. Idempotente: remove apenas registros de teste (razão social de teste).

migrate(
  (app) => {
    var provas = app.findRecordsByFilter('contratos', "negocio = '4warv94hav36065'", '', 100, 0)
    var removidos = 0
    for (var i = 0; i < provas.length; i++) {
      try {
        app.delete(provas[i])
        removidos++
      } catch (_) {}
    }
    $app.logger().info('T317 limpeza fixtures', 'removidos', String(removidos))
  },
  (app) => {},
)
