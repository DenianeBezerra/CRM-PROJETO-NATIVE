migrate(
  (app) => {
    // T2.32 — quinto reset do handoff da prova (convergências anteriores
    // executaram o aceite da prova com a rota antiga; idempotente).
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
