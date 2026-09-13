// T3.19 fix: BoolField 'ativo' com required=true rejeita false como blank no JSVM
// ("ativo: cannot be blank" ao desativar). required removido — false é valor válido de config.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('relatorios_agendados')
    var f = col.fields.getByName('ativo')
    f.required = false
    app.save(col)
  },
  (app) => {},
)
