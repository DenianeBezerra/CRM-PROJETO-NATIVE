migrate(
  (app) => {
    // T2.25 — limpeza da fixture: v13 (proposta emitida de prova) e seu
    // registro na fila. Delete direto via app (API bloqueia).
    const props = app.findRecordsByFilter('propostas', 'versao = 13', '', 5, 0)
    for (let i = 0; i < props.length; i++) {
      const pid = props[i].id
      const filas = app.findRecordsByFilter(
        'fila_propostas_vencidas',
        'proposta = "' + pid + '"',
        '',
        10,
        0,
      )
      for (let j = 0; j < filas.length; j++) app.delete(filas[j])
      app.delete(props[i])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
