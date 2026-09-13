// T3.16 — limpeza da fixture de teste do ajuste (empresa ZZ-TESTE-T316B-EMAIL).
// Remove etapas, implantação e empresa de teste. Ficha real da Felicidade NÃO é tocada.

migrate(
  (app) => {
    var empresaId = 'qkkiseh2w1g4ygs'
    var implId = 'kq2o1izrrlbowc9'
    var etapas = app.findRecordsByFilter('implantacao_etapas', 'implantacao = {:i}', '', 100, 0, {
      i: implId,
    })
    for (var i = 0; i < etapas.length; i++) app.delete(etapas[i])
    var im = app.findRecordById('implantacoes', implId)
    app.delete(im)
    var emp = app.findRecordById('empresas', empresaId)
    app.delete(emp)
  },
  (app) => {},
)
