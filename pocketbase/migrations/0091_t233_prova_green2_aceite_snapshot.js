migrate(
  (app) => {
    // T2.33 — prepara a prova GREEN-2 (aceite com snapshot): volta o handoff
    // para pendente com checklist completo.
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
      h.set('devolvido_por', '')
      h.set('devolvido_em', '')
      h.set('motivo_devolucao', '')
      h.set('snapshot_decisao', '')
      app.save(h)
    } catch (_) {}
  },
  (app) => {},
)
