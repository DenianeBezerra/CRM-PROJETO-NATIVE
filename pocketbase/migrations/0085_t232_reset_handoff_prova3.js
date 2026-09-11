migrate(
  (app) => {
    // T2.32 — terceiro reset do handoff da prova (convergências do pod executaram
    // o aceite da prova com a rota antiga; idempotente: só age se aceito).
    const HID = 'd0ls2ojv27kpdcg'
    try {
      const h = app.findRecordById('handoffs', HID)
      if (String(h.get('status')) === 'aceito') {
        h.set('status', 'pendente')
        h.set('aceito_por', '')
        h.set('aceito_em', '')
        app.save(h)
      }
    } catch (_) {}
  },
  (app) => {},
)
