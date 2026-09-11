migrate(
  (app) => {
    // T2.14 — reparo do histórico de permanências do negócio real
    // "Proposta BPO": permanência fantasma de fechado_perdido aberta
    // (resíduo de prova do baseline) enquanto o negócio está em novo.
    const negocioId = 'ek8vvnaisupsnga'
    const agora = new Date().toISOString().replace('T', ' ')

    const fantasmas = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' +
        negocioId +
        '" && etapa = "fechado_perdido" && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '',
      10,
      0,
    )
    for (let i = 0; i < fantasmas.length; i++) {
      fantasmas[i].set('saiu_em', agora)
      app.save(fantasmas[i])
    }

    const emNovo = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + negocioId + '" && etapa = "novo"',
      '-entrou_em',
      1,
      0,
    )
    if (emNovo.length > 0 && String(emNovo[0].get('saiu_em') || '').trim() !== '') {
      emNovo[0].set('saiu_em', '')
      app.save(emNovo[0])
    }
  },
  (app) => {
    // Down: irreversível por design (reparo).
  },
)
