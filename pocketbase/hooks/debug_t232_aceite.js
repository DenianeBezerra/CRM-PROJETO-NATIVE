// T2.32 — Rota debug SOMENTE-LEITURA: mostra o que a rota de aceite enxerga
// (checklist parseado, obrigatórios pendentes calculados). Diagnóstico do
// aceite indevido. REMOVE-SE após o diagnóstico.
routerAdd(
  'GET',
  '/backend/v1/debug/t232-aceite',
  (e) => {
    const actor = e.auth
    if (!actor || actor.get('role') !== 'admin') {
      return e.json(403, { error: 'Rota debug exclusiva de administradores.' })
    }
    const out = {}
    const HID = 'd0ls2ojv27kpdcg'
    const h = $app.findRecordById('handoffs', HID)
    out.status = String(h.get('status'))
    const raw = h.get('checklist')
    out.raw_tipo = typeof raw
    let checklist = []
    try {
      checklist = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw || []
    } catch (err) {
      out.parse_erro = String(err)
    }
    out.itens = []
    const pendentes = []
    for (let i = 0; i < checklist.length; i++) {
      const it = checklist[i]
      const obrig = it ? it.obrigatorio === true : false
      const feito = it ? it.feito === true : false
      out.itens.push({ item: String(it && it.item ? it.item : ''), obrig: obrig, feito: feito })
      if (obrig && !feito) pendentes.push(String(it.item || ''))
    }
    out.obrigatorios_pendentes = pendentes
    out.deveria_bloquear = pendentes.length > 0
    return e.json(200, out)
  },
  $apis.requireAuth(),
)
