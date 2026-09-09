// Histórico de permanência por etapa (model hooks).
// Model hooks executam DENTRO da transação do próprio save — a criação/fechamento
// da permanência é atômica com a mudança de estágio, sem runInTransaction manual
// (chamar e.next() dentro de runInTransaction em request hook provoca deadlock).
// Append-only: sem update/delete pelo cliente.
onRecordCreate((e) => {
  const db = e.app || $app
  const stage = String(e.record.get('estagio') || '').trim()
  if (!stage) return e.next()
  const permCollection = db.findCollectionByNameOrId('permanencias_negocio')
  const entry = new Record(permCollection)
  entry.set('negocio', e.record.id)
  entry.set('etapa', stage)
  entry.set('entrou_em', new Date().toISOString())
  db.save(entry)
  e.next()
}, 'negocios')

onRecordUpdate((e) => {
  const db = e.app || $app
  const before = e.record.original()
  const previousStage = String(before.get('estagio') || '').trim()
  const nextStage = String(e.record.get('estagio') || '').trim()
  if (!nextStage || previousStage === nextStage) return e.next()

  const permCollection = db.findCollectionByNameOrId('permanencias_negocio')
  const open = db.findRecordsByFilter(
    permCollection,
    'negocio = {:negocio} && (saiu_em = "" || saiu_em ~ "0001-01-01")',
    '-created',
    2,
    0,
    { negocio: e.record.id },
  )

  if (open.length > 1) {
    // Estado inválido: sinaliza erro controlado, sem somar duas vezes.
    throw new Error(
      'Estado inválido: múltiplas permanências abertas para a mesma oportunidade. Corrija o histórico antes de movimentar.',
    )
  }

  const now = new Date().toISOString()
  if (open.length === 1) {
    const entry = open[0]
    if (entry.get('etapa') !== previousStage) {
      throw new Error(
        'Histórico inconsistente: permanência aberta não corresponde à etapa anterior da oportunidade.',
      )
    }
    const entered = new Date(entry.get('entrou_em'))
    const duration = Math.max(0, Math.floor((Date.now() - entered.getTime()) / 1000))
    entry.set('saiu_em', now)
    entry.set('duracao_segundos', duration)
    db.save(entry)
  }

  const entry = new Record(permCollection)
  entry.set('negocio', e.record.id)
  entry.set('etapa', nextStage)
  entry.set('entrou_em', now)
  db.save(entry)
  e.next()
}, 'negocios')
