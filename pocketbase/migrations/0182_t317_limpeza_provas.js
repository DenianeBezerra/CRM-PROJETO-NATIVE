// T3.17 — limpeza das fixtures de prova (contratos v1/v2 gerados por API no negócio
// real da Felicidade durante as provas RED/GREEN). Padrão das limpezas 0163/0170/0177:
// a base real fica zerada de provas; o teste humano começa limpo.
migrate(
  (app) => {
    var provas = app.findRecordsByFilter('contratos', "negocio = '4warv94hav36065'", '', 250, 0)
    for (var i = 0; i < provas.length; i++) app.delete(provas[i])
  },
  (app) => {},
)
