// T3.17 — correção: o campo conteudo de contratos nasceu com max padrão (5000) —
// o contrato integral passa disso. A propriedade correta do TextField é `max`
// (maxSize foi ignorado na 0180). Esta migration ajusta para 200000.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('contratos')
    var campo = col.fields.getByName('conteudo')
    campo.max = 200000
    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('contratos')
    var campo = col.fields.getByName('conteudo')
    campo.max = 5000
    app.save(col)
  },
)
