// T2.01 — CA-2-036: validação server-side dos campos comerciais canônicos.
// Model hooks (dentro da transação do próprio save) — sem request hook transacional.
// T3.20 — SPEC-3-020 (C-03): etapa do funil é a FONTE ÚNICA da verdade — status e
// probabilidade DERIVAM da etapa em toda gravação (create e update). Status divergente
// da etapa não é mais rejeitado: é SOBRESCRITO com o valor derivado (a etapa vence).
// Ganho exige valor > 0 e data_ganho (B-14). Probabilidade: 100 no ganho, 0 na perda,
// editável apenas em etapas intermediárias (B-15).
onRecordCreate((e) => {
  const stage = String(e.record.get('estagio') || '').trim()
  const statusEnviado = String(e.record.get('status') || '').trim()

  const score = e.record.get('score')
  if (score !== undefined && score !== null && String(score) !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('Score deve estar entre 0 e 100.')
    }
  }

  // ---- C-03: status derivado da etapa (a etapa vence) ----
  let statusDerivado = 'em_negociacao'
  if (stage === 'fechado_ganho') statusDerivado = 'ganho'
  else if (stage === 'fechado_perdido') statusDerivado = 'perdido'
  e.record.set('status', statusDerivado)

  // ---- C-03: probabilidade derivada da etapa ----
  if (stage === 'fechado_ganho') {
    e.record.set('probabilidade', 100)
  } else if (stage === 'fechado_perdido') {
    e.record.set('probabilidade', 0)
  }

  // ---- B-14: ganho exige valor > 0 e data_ganho ----
  if (stage === 'fechado_ganho') {
    const valor = Number(e.record.get('valor') || 0)
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error('Ganho exige o valor da mensalidade maior que zero.')
    }
    const dg = String(e.record.get('data_ganho') || '')
    if (!dg || dg.startsWith('0001-01-01')) {
      e.record.set('data_ganho', new Date().toISOString())
    }
  }

  const entrada = String(e.record.get('data_entrada') || '')
  if (!entrada || entrada.startsWith('0001-01-01')) {
    e.record.set('data_entrada', new Date().toISOString())
  }
  e.next()
}, 'negocios')

// T2.34 — CA-2-029: a criação de handoff no ganho vive EXCLUSIVAMENTE em
// handoff_ganho.js (dono único). Este arquivo NÃO registra mais um segundo
// onRecordUpdate para 'negocios' — a duplicação conflitava e o handoff parou
// de ser criado (provado por API em 2026-09-12: 8+ ganhos, 0 handoffs).
onRecordUpdate((e) => {
  const stage = String(e.record.get('estagio') || '').trim()
  const statusEnviado = String(e.record.get('status') || '').trim()

  const score = e.record.get('score')
  if (score !== undefined && score !== null && String(score) !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('Score deve estar entre 0 e 100.')
    }
  }

  // ---- C-03: status derivado da etapa (a etapa vence) ----
  let statusDerivado = 'em_negociacao'
  if (stage === 'fechado_ganho') statusDerivado = 'ganho'
  else if (stage === 'fechado_perdido') statusDerivado = 'perdido'
  e.record.set('status', statusDerivado)

  // ---- C-03/B-15: probabilidade derivada da etapa ----
  if (stage === 'fechado_ganho') {
    e.record.set('probabilidade', 100)
  } else if (stage === 'fechado_perdido') {
    e.record.set('probabilidade', 0)
  }

  // ---- B-14: transição para ganho exige valor > 0 ----
  const beforeStage = String(e.record.original().get('estagio') || '').trim()
  if (stage === 'fechado_ganho' && beforeStage !== 'fechado_ganho') {
    const valor = Number(e.record.get('valor') || 0)
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error('Ganho exige o valor da mensalidade maior que zero.')
    }
    const dg = String(e.record.get('data_ganho') || '')
    if (!dg || dg.startsWith('0001-01-01')) {
      e.record.set('data_ganho', new Date().toISOString())
    }
  }

  e.next()
}, 'negocios')
