migrate(
  (app) => {
    // T2.32 — quarto reset (convergência do pod executou o aceite da prova de
    // novo; idempotente: só age se aceito).
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
