migrate(
  (app) => {
    // T2.32 — reset do handoff da prova para 'pendente' (o aceite indevido da
    // primeira prova, antes da 0082, gravou status=aceito com checklist sem
    // obrigatórios). O handoff volta a pendente para o fluxo real ser exercitado.
    const HID = 'd0ls2ojv27kpdcg'
    try {
      const h = app.findRecordById('handoffs', HID)
      if (String(h.get('status')) === 'aceito') {
        h.set('status', 'pendente')
        h.set('aceito_por', '')
        h.set('aceito_em', '')
        app.save(h)
      }
    } catch (_) {
      // handoff não existe mais — nada a fazer
    }
  },
  (app) => {
    // Down: sem reversão.
  },
)
