// T3.16 ajuste (CEO 22:44): "Preparação do contrato" entra como etapa do PIPELINE COMERCIAL,
// entre "Fechado ganho" e o handoff para implantação (ordem 45).
// Etapa do sistema (sistema=true), ativa, sem migração automática de destino.

migrate(
  (app) => {
    var existe = app.findRecordsByFilter(
      'etapas_negocio',
      "chave = 'preparacao_contrato'",
      '',
      1,
      0,
    )
    if (existe.length === 0) {
      var col = app.findCollectionByNameOrId('etapas_negocio')
      var rec = new Record(col)
      rec.set('chave', 'preparacao_contrato')
      rec.set('nome', 'Preparação do contrato')
      rec.set('ordem', 45)
      rec.set('sistema', true)
      rec.set('ativa', true)
      rec.set('migracao_destino', '')
      app.save(rec)
    }
  },
  (app) => {
    var recs = app.findRecordsByFilter('etapas_negocio', "chave = 'preparacao_contrato'", '', 1, 0)
    for (var i = 0; i < recs.length; i++) app.delete(recs[i])
  },
)
