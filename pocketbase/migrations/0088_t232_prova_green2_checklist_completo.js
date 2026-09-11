migrate(
  (app) => {
    // T2.32 — prepara a prova GREEN-2: checklist completo (feito=true) e
    // pendências resolvidas. O aceite deve então passar (200).
    const HID = 'd0ls2ojv27kpdcg'
    try {
      const h = app.findRecordById('handoffs', HID)
      const raw = h.get('checklist')
      const cl = JSON.parse(typeof raw === 'string' ? raw : String(raw))
      for (let i = 0; i < cl.length; i++) {
        cl[i].feito = true
      }
      h.set('checklist', JSON.stringify(cl))
      h.set('pendencias', '')
      h.set('status', 'pendente')
      h.set('aceito_por', '')
      h.set('aceito_em', '')
      app.save(h)
    } catch (_) {}
  },
  (app) => {},
)
