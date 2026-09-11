migrate(
  (app) => {
    // T2.34 — limpeza das fixtures de prova (negócios + handoffs criados nas
    // provas RED/GREEN). Negócio real "Proposta BPO" e handoff real ficam.
    const negocioProva = [
      'gbbvsq2cc0elc3c',
      'x4c8kyenwg4yrl7',
      'eso7ng19tk2kvzp',
      '750ge46kwtuxspq',
    ]
    for (let i = 0; i < negocioProva.length; i++) {
      try {
        const hs = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 200, 0, {
          n: negocioProva[i],
        })
        for (let j = 0; j < hs.length; j++) app.delete(hs[j])
      } catch (_) {}
      try {
        app.delete(app.findRecordById('negocios', negocioProva[i]))
      } catch (_) {}
    }
  },
  (app) => {},
)
