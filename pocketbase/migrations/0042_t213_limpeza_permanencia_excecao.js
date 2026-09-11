migrate(
  (app) => {
    // T2.13 — limpeza: repara o histórico de permanências do negócio real
    // "Proposta BPO" (corrompido pelos bloqueios da versão model hook —
    // permanência fantasma de contato_feito aberta enquanto o negócio está
    // em novo) e remove a exceção de prova usada nas provas RED/GREEN.
    const negocioId = 'ek8vvnaisupsnga'

    // 1) Permanência fantasma aberta em contato_feito: fecha com saiu_em agora.
    const fantasmas = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' +
        negocioId +
        '" && etapa = "contato_feito" && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '',
      10,
      0,
    )
    const agora = new Date().toISOString().replace('T', ' ')
    for (let i = 0; i < fantasmas.length; i++) {
      fantasmas[i].set('saiu_em', agora)
      app.save(fantasmas[i])
    }

    // 2) Permanência de novo: reabre (saiu_em limpo) para casar com o estado real.
    const emNovo = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + negocioId + '" && etapa = "novo"',
      '-entrou_em',
      1,
      0,
    )
    if (emNovo.length > 0) {
      emNovo[0].set('saiu_em', '')
      app.save(emNovo[0])
    }

    // 3) Exceção de prova: remove (delete direto via app, sem regra de API).
    const excecoes = app.findRecordsByFilter(
      'excecoes_qualificacao',
      'negocio = "' + negocioId + '"',
      '',
      50,
      0,
    )
    for (let i = 0; i < excecoes.length; i++) {
      app.delete(excecoes[i])
    }
  },
  (app) => {
    // Down: não recria provas — irreversível por design (limpeza).
  },
)
