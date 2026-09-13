// T3.22 v4 — SPEC-3-022: campos do complemento de contatos múltiplos.
// clientes.cargo (CA-3-130) + empresas.natureza_registro (CA-3-120).
// Lição 0168: campo novo via fields.add APÓS o save da coleção; índice após campos.
migrate(
  (app) => {
    var cli = app.findCollectionByNameOrId('clientes')
    var temCargo = false
    for (var i = 0; i < cli.fields.length; i++) {
      if (cli.fields[i].name === 'cargo') temCargo = true
    }
    if (!temCargo) cli.fields.add(new TextField({ name: 'cargo', max: 120 }))
    app.save(cli)

    var emp = app.findCollectionByNameOrId('empresas')
    var temNat = false
    for (var j = 0; j < emp.fields.length; j++) {
      if (emp.fields[j].name === 'natureza_registro') temNat = true
    }
    if (!temNat)
      emp.fields.add(
        new SelectField({
          name: 'natureza_registro',
          maxSelect: 1,
          values: ['cliente', 'empresa_grupo', 'projeto'],
        }),
      )
    app.save(emp)
  },
  (app) => {
    // down best-effort: sem remoção destrutiva (campos ficam vazios)
  },
)
