// T2.01 / CA-2-036 — validação server-side dos 8 campos do contrato comercial.
// Model hooks (dentro da transação do próprio save — atomicidade sem
// runInTransaction manual; lição AP-2026-09-09-1900).
// Runtime goja: callbacks NÃO enxergam o escopo superior — constantes duplicadas
// inline em cada callback.

onRecordCreate((e) => {
  const ORIGINS = ['indicacao', 'site', 'redes_sociais', 'evento', 'outro']
  const PRIORITIES = ['baixa', 'media', 'alta']
  const SERVICES = ['bpo_financeiro', 'controladoria', 'cfo_as_a_service', 'outro']
  const STATUSES = ['em_aberto', 'em_negociacao', 'pausado', 'ganho', 'perdido']

  const record = e.record
  const origin = String(record.get('origem') || '')
  if (origin && !ORIGINS.includes(origin)) throw new Error('Origem inválida.')

  const priority = String(record.get('prioridade') || '')
  if (priority && !PRIORITIES.includes(priority)) throw new Error('Prioridade inválida.')

  const score = record.get('score')
  if (score !== null && score !== undefined && score !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('O score deve estar entre 0 e 100.')
    }
  }

  const service = String(record.get('servico') || '')
  if (service && !SERVICES.includes(service)) throw new Error('Serviço inválido.')

  const status = String(record.get('status') || '')
  if (status && !STATUSES.includes(status)) throw new Error('Status inválido.')

  // Coerência status × etapa final (mesma regra do frontend).
  const stage = String(record.get('estagio') || '')
  if (stage === 'fechado_ganho' && status && status !== 'ganho') {
    throw new Error('Status divergente da etapa final.')
  }
  if (stage === 'fechado_perdido' && status && status !== 'perdido') {
    throw new Error('Status divergente da etapa final.')
  }
  if (
    stage !== 'fechado_ganho' &&
    stage !== 'fechado_perdido' &&
    (status === 'ganho' || status === 'perdido')
  ) {
    throw new Error('Status "ganho"/"perdido" só valem em etapas finais.')
  }

  // data_entrada: se ausente no create, herda o instante de criação (auditável).
  const entry = record.get('data_entrada')
  if (!entry || String(entry).startsWith('0001-01-01')) {
    record.set('data_entrada', new Date().toISOString())
  }

  e.next()
}, 'negocios')

onRecordUpdate((e) => {
  const ORIGINS = ['indicacao', 'site', 'redes_sociais', 'evento', 'outro']
  const PRIORITIES = ['baixa', 'media', 'alta']
  const SERVICES = ['bpo_financeiro', 'controladoria', 'cfo_as_a_service', 'outro']
  const STATUSES = ['em_aberto', 'em_negociacao', 'pausado', 'ganho', 'perdido']

  const record = e.record
  const origin = String(record.get('origem') || '')
  if (origin && !ORIGINS.includes(origin)) throw new Error('Origem inválida.')

  const priority = String(record.get('prioridade') || '')
  if (priority && !PRIORITIES.includes(priority)) throw new Error('Prioridade inválida.')

  const score = record.get('score')
  if (score !== null && score !== undefined && score !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('O score deve estar entre 0 e 100.')
    }
  }

  const service = String(record.get('servico') || '')
  if (service && !SERVICES.includes(service)) throw new Error('Serviço inválido.')

  const status = String(record.get('status') || '')
  if (status && !STATUSES.includes(status)) throw new Error('Status inválido.')

  const stage = String(record.get('estagio') || '')
  if (stage === 'fechado_ganho' && status && status !== 'ganho') {
    throw new Error('Status divergente da etapa final.')
  }
  if (stage === 'fechado_perdido' && status && status !== 'perdido') {
    throw new Error('Status divergente da etapa final.')
  }
  if (
    stage !== 'fechado_ganho' &&
    stage !== 'fechado_perdido' &&
    (status === 'ganho' || status === 'perdido')
  ) {
    throw new Error('Status "ganho"/"perdido" só valem em etapas finais.')
  }

  // data_entrada nunca é zerada em update — preserva a data original.
  const entry = record.get('data_entrada')
  if (!entry || String(entry).startsWith('0001-01-01')) {
    const previous = record.original().get('data_entrada')
    if (previous && !String(previous).startsWith('0001-01-01')) {
      record.set('data_entrada', previous)
    } else {
      record.set('data_entrada', new Date().toISOString())
    }
  }

  e.next()
}, 'negocios')
