migrate(
  (app) => {
    // T2.29 — limpeza das fixtures de prova (usuários inativos criados para
    // o guard de responsável inativo).
    const emails = ['fixture.t229@vibratto.com.br', 'fixture.t229b@vibratto.com.br']
    for (let i = 0; i < emails.length; i++) {
      try {
        const u = app.findAuthRecordByEmail(emails[i])
        if (u) app.delete(u)
      } catch (_) {
        /* já removida */
      }
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
