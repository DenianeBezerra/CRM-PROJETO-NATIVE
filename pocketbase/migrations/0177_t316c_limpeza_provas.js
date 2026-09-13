// T3.16c — limpeza da fixture de teste da assinatura (empresa ZZ-TESTE-T316C-ASSINATURA).

migrate(
  (app) => {
    var empresaId = 'kh0gzyeegv6bkno'
    var implId = 'q6r7yym95k56nig'
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
