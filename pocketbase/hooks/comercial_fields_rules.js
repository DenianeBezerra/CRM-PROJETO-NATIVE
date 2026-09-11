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

// T2.31 — CA-2-026: ganho cria handoff idempotente (model hook update).
// IDEMPOTENTE: se já existe handoff para o negócio, não duplica e NÃO
// sobrescreve decisão existente. Falha na criação NÃO quebra o ganho.
onRecordUpdate((e) => {
  let antes = ''
  let depois = ''
  try {
    antes = String(e.record.original().get('estagio') || '')
    depois = String(e.record.get('estagio') || '')
  } catch (err) {
    $app.logger().error('T231 falha ao ler estagios', 'error', String(err))
    return e.next()
  }
  if (depois !== 'fechado_ganho' || antes === 'fechado_ganho') return e.next()

  const negocioId = e.record.id
  const ator = e.auth ? e.auth.id : ''
  const origem = String(e.record.get('servico') || 'outro') || 'outro'
  const receptor = String(e.record.get('responsavel') || '') || ator
  const observacao = String(e.record.get('observacao_ganho') || '')

  const checklistPadrao = [
    { item: 'Contrato assinado e arquivado', feito: false },
    { item: 'Documentos fiscais e societários recebidos', feito: false },
    { item: 'Acessos aos sistemas do cliente (Omie/Conta Azul/Nibo)', feito: false },
    { item: 'Reunião de kickoff agendada', feito: false },
    { item: 'Escopo e rotinas transferidos para a operação', feito: false },
  ]

  let existente = []
  try {
    existente = $app.findRecordsByFilter('handoffs', 'negocio = "' + negocioId + '"', '', 1, 0)
  } catch (err) {
    $app.logger().error('T231 falha ao checar handoff existente', 'error', String(err))
    return e.next()
  }
  if (existente.length > 0) {
    return e.next()
  }

  const col = $app.findCollectionByNameOrId('handoffs')
  const rec = new Record(col)
  rec.set('negocio', negocioId)
  rec.set('origem', origem)
  rec.set('responsavel_emissor', ator)
  rec.set('responsavel_receptor', receptor)
  rec.set('status', 'pendente')
  rec.set('checklist', JSON.stringify(checklistPadrao))
  rec.set('observacao_ganho', observacao)
  rec.set('criado_em', new Date().toISOString().replace('T', ' '))
  try {
    $app.save(rec)
    $app.logger().info('T231 handoff criado no ganho', 'negocio', negocioId, 'emissor', ator)
  } catch (err) {
    $app.logger().error('T231 falha ao criar handoff', 'error', String(err))
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
