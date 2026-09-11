migrate(
  (app) => {
    // T2.30 — limpeza da fixture de prova (usuário probe de RBAC).
    try {
      const u = app.findAuthRecordByEmail('probe.t230@vibratto.com.br')
      if (u) app.delete(u)
    } catch (_) {
      /* já removida */
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
