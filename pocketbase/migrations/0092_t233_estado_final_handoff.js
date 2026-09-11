migrate(
  (app) => {
    // T2.33 — estado final do handoff real: volta a pendente com checklist
    // padrão (obrigatórios pendentes) para o teste humano da cliente.
    const HID = 'd0ls2ojv27kpdcg'
    try {
      const h = app.findRecordById('handoffs', HID)
      const raw = h.get('checklist')
      const cl = JSON.parse(typeof raw === 'string' ? raw : String(raw))
      for (let i = 0; i < cl.length; i++) {
        cl[i].feito = false
      }
      h.set('checklist', JSON.stringify(cl))
      h.set('pendencias', '')
      h.set('status', 'pendente')
      h.set('aceito_por', '')
      h.set('aceito_em', '')
      h.set('devolvido_por', '')
      h.set('devolvido_em', '')
      h.set('motivo_devolucao', '')
      h.set('snapshot_decisao', '')
      app.save(h)
    } catch (_) {}
  },
  (app) => {},
)
