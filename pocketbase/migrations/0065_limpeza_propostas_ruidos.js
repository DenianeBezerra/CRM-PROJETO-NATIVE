migrate(
  (app) => {
    // Limpeza de ruídos (pós-T2.26, pedido da cliente): as propostas v1–v13
    // do negócio real são todas fixtures/provas — o conteúdo real de proposta
    // ainda não existe. Remove TODAS as propostas e registros de fila delas,
    // deixando o negócio "Proposta BPO" limpo para uso real.
    const nid = 'ek8vvnaisupsnga'

    const filas = app.findRecordsByFilter(
      'fila_propostas_vencidas',
      'negocio = "' + nid + '"',
      '',
      100,
      0,
    )
    for (let i = 0; i < filas.length; i++) app.delete(filas[i])

    const props = app.findRecordsByFilter('propostas', 'negocio = "' + nid + '"', '', 100, 0)
    for (let i = 0; i < props.length; i++) app.delete(props[i])
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
