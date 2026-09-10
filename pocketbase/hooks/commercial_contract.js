// T2.01 / CA-2-036 — contrato comercial canônico: validação server-side dos 8 campos
// e auditoria append-only do ciclo completo (create, update e delete).
//
// Model hooks (não request hooks com runInTransaction — lição AP-2026-09-09-1900:
// e.next() dentro de runInTransaction em request hook provoca deadlock; model hooks
// executam dentro da transação do próprio save, atomicamente).
//
// Constantes e auxiliares vivem DENTRO de cada callback — o runtime de hooks não
// resolve referências do escopo superior do arquivo.

const ORIGINS = ['site', 'indicacao', 'redes_sociais', 'evento', 'outbound', 'outro']
const PRIORITIES = ['baixa', 'media', 'alta', 'critica']
const SERVICES = [
  'bpo_financeiro',
  'controladoria',
  'cfo_as_a_service',
  'mentoria',
  'consultoria',
  'outro',
]
const STATUSES = ['em_qualificacao', 'em_negociacao', 'proposta_enviada', 'em_garantia', 'suspenso']
const TAGS = [
  'bpo_financeiro',
  'controladoria',
  'cfo_as_a_service',
  'mentoria',
  'recorrente',
  'projeto',
  'estrategico',
  'urgente',
]

function validateCommercialContract(record) {
  const origin = String(record.get('origem') || '')
  if (origin && !ORIGINS.includes(origin)) {
    throw new Error('Origem inválida.')
  }

  const tags = record.get('tags') || []
  for (const tag of tags) {
    if (!TAGS.includes(tag)) {
      throw new Error('Tag inválida: ' + tag)
    }
  }

  const priority = String(record.get('prioridade') || '')
  if (priority && !PRIORITIES.includes(priority)) {
    throw new Error('Prioridade inválida.')
  }

  const score = record.get('score')
  if (score !== null && score !== undefined && score !== '') {
    const n = Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error('O score deve estar entre 0 e 100.')
    }
  }

  const service = String(record.get('servico') || '')
  if (service && !SERVICES.includes(service)) {
    throw new Error('Serviço inválido.')
  }

  const status = String(record.get('status') || '')
  if (status && !STATUSES.includes(status)) {
    throw new Error('Status inválido.')
  }

  // data_entrada: se ausente no create, herda o instante de criação (auditável).
  const entry = record.get('data_entrada')
  if (!entry || String(entry).startsWith('0001-01-01')) {
    record.set('data_entrada', new Date().toISOString())
  }
}

function writeAudit(db, entity, recordId, action, actorId, before, after) {
  const audit = db.findCollectionByNameOrId('auditoria')
  const event = new Record(audit)
  event.set('entidade', entity)
  event.set('registro_id', recordId)
  event.set('acao', action)
  event.set('ator_id', actorId)
  event.set('ocorrido_em', new Date().toISOString())
  event.set('estado_anterior', before || '')
  event.set('estado_posterior', after || '')
  db.save(event)
}

onRecordCreate((e) => {
  const db = e.app || $app
  validateCommercialContract(e.record)
  e.next()
}, 'negocios')

onRecordUpdate((e) => {
  const db = e.app || $app
  validateCommercialContract(e.record)
  e.next()
}, 'negocios')

onRecordDelete((e) => {
  const db = e.app || $app
  // Snapshot anterior preservado antes da exclusão (append-only).
  const before = JSON.stringify(e.record.original().publicExport())
  const actorId = String(e.record.get('excluido_por') || '')
  writeAudit(db, 'negocios', e.record.id, 'delete', actorId, before, '')
  e.next()
}, 'negocios')
