migrate(
  (app) => {
    const perms = app.findCollectionByNameOrId('permanencias_negocio')
    const openA = app.findRecordsByFilter(
      perms,
      'negocio = {:n} && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '-created',
      5,
      0,
      { n: 'zrpnluc5bbqrxio' },
    )
    for (const row of openA) {
      if (row.getString('etapa') === 'proposta') {
        app.delete(row)
      }
    }
  },
  (app) => {},
)
