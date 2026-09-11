migrate(
  (app) => {
    // T2.35 — limpeza das fixtures de prova (negócio + handoff aceito criados
    // na 0095). Negócio real "Proposta BPO" e handoff real ficam.
    try {
      const hs = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 10, 0, {
        n: '9j68rhow7e30gb6',
      })
      for (let i = 0; i < hs.length; i++) app.delete(hs[i])
    } catch (_) {}
    try {
      app.delete(app.findRecordById('negocios', '9j68rhow7e30gb6'))
    } catch (_) {}
  },
  (app) => {},
)
