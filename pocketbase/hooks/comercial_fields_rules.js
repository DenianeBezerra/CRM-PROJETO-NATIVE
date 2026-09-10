// T2.01 — CA-2-036: validação server-side dos campos comerciais canônicos.
// Model hooks (dentro da transação do próprio save) — sem request hook transacional.
// Regras: score 0–100 (também na coleção), status coerente com etapa,
// data_entrada automática na criação.
onRecordCreate((e) => {
  const stage = String(e.record.get('estagio') || '').trim()
  let status = String(e.record.get('status') || '').trim()

  const score = e.record.get('score')
  if (score !== undefined && score !== null && String(score) !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('Score deve estar entre 0 e 100.')
    }
  }

  if (stage === 'fechado_ganho') {
    if (!status) {
      status = 'ganho'
      e.record.set('status', status)
    } else if (status !== 'ganho') {
      throw new Error('Status divergente: oportunidade ganha exige status "ganho".')
    }
  } else if (stage === 'fechado_perdido') {
    if (!status) {
      status = 'perdido'
      e.record.set('status', status)
    } else if (status !== 'perdido') {
      throw new Error('Status divergente: oportunidade perdida exige status "perdido".')
    }
  } else if (status === 'ganho' || status === 'perdido') {
    throw new Error('Status divergente: "ganho"/"perdido" só valem em etapas finais.')
  }

  const entrada = String(e.record.get('data_entrada') || '')
  if (!entrada || entrada.startsWith('0001-01-01')) {
    e.record.set('data_entrada', new Date().toISOString())
  }
  e.next()
}, 'negocios')

onRecordUpdate((e) => {
  const stage = String(e.record.get('estagio') || '').trim()
  const status = String(e.record.get('status') || '').trim()

  const score = e.record.get('score')
  if (score !== undefined && score !== null && String(score) !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('Score deve estar entre 0 e 100.')
    }
  }

  if (stage === 'fechado_ganho' && status && status !== 'ganho') {
    throw new Error('Status divergente: oportunidade ganha exige status "ganho".')
  }
  if (stage === 'fechado_perdido' && status && status !== 'perdido') {
    throw new Error('Status divergente: oportunidade perdida exige status "perdido".')
  }
  if (stage && stage !== 'fechado_ganho' && stage !== 'fechado_perdido') {
    if (status === 'ganho' || status === 'perdido') {
      throw new Error('Status divergente: "ganho"/"perdido" só valem em etapas finais.')
    }
  }
  e.next()
}, 'negocios')
