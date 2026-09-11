migrate(
  (app) => {
    // T2.29 — CA-2-024: campos de pausa estruturada e controle de concorrência.
    // - motivo_pausa: texto obrigatório ao pausar (validação no hook);
    // - versao_registro: inteiro incrementado server-side a cada update —
    //   update sem a versão atual é rejeitado (409 lógico), impedindo que a
    //   segunda de duas atualizações concorrentes sobrescreva a primeira.
    const col = app.findCollectionByNameOrId('negocios')

    if (!col.fields.getByName('motivo_pausa')) {
      col.fields.add(
        new TextField({
          name: 'motivo_pausa',
          max: 1000,
        }),
      )
    }
    if (!col.fields.getByName('versao_registro')) {
      col.fields.add(
        new NumberField({
          name: 'versao_registro',
          onlyInt: true,
        }),
      )
    }
    app.save(col)

    // Backfill: registros existentes começam na versão 1.
    const negocios = app.findRecordsByFilter(
      'negocios',
      'versao_registro = 0 || versao_registro = ""',
      '',
      10000,
      0,
    )
    for (let i = 0; i < negocios.length; i++) {
      negocios[i].set('versao_registro', 1)
      app.save(negocios[i])
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('negocios')
    try {
      col.fields.removeByName('motivo_pausa')
    } catch (_) {}
    try {
      col.fields.removeByName('versao_registro')
    } catch (_) {}
    app.save(col)
  },
)
