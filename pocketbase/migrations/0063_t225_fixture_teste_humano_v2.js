migrate(
  (app) => {
    // T2.25 — fixture do teste humano (correção): retroage a validade da
    // proposta emitida de teste pelo ID (a versão sequencial não é 14).
    const alvo = app.findRecordsByFilter('propostas', 'id = "mtvv00hq78y86gh"', '', 5, 0)
    for (let i = 0; i < alvo.length; i++) {
      alvo[i].set('validade', '2026-09-10 12:00:00.000Z')
      app.save(alvo[i])
    }
  },
  (app) => {
    // Down: irreversível por design (fixture).
  },
)
