migrate(
  (app) => {
    // Fixture temporária da T9.2:
    // 1. Injeta segunda permanência aberta no negócio zrpnluc5bbqrxio (estado inválido).
    // 2. Define a permanência aberta de yqtfulfajbw8s9l com entrada de exatamente 10 dias atrás.
    // Removida pela migration 0018 após os testes.
    const perms = app.findCollectionByNameOrId('permanencias_negocio')

    // 1. Estado inválido: segunda permanência aberta.
    const dealA = app.findRecordById('negocios', 'zrpnluc5bbqrxio')
    const dup = new Record(perms)
    dup.set('negocio', dealA.id)
    dup.set('etapa', 'proposta')
    dup.set('entrou_em', new Date(Date.now() - 3600 * 1000).toISOString())
    app.save(dup)

    // 2. Parada com exatamente 10 dias.
    const dealB = app.findRecordById('negocios', 'yqtfulfajbw8s9l')
    const openB = app.findRecordsByFilter(
      perms,
      'negocio = {:n} && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '-created',
      1,
      0,
      { n: dealB.id },
    )
    if (openB.length === 1) {
      openB[0].set('entrou_em', new Date(Date.now() - 10 * 86400 * 1000).toISOString())
      app.save(openB[0])
    }
  },
  (app) => {
    // Rollback espelha a limpeza da 0018.
  },
)
