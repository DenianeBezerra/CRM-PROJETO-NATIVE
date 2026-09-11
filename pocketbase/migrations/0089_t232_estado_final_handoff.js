migrate(
  (app) => {
    // T2.32 — estado final do handoff real: volta a 'pendente' com checklist
    // padrão (obrigatórios marcados, itens pendentes) e pendências limpas,
    // para o teste humano da cliente exercitar o fluxo completo.
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
      app.save(h)
    } catch (_) {}
  },
  (app) => {},
)
