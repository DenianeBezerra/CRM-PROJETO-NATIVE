// Histórico de permanência por etapa: fecha a permanência aberta e cria a nova
// na mesma transação da mudança de estágio. Append-only: sem update/delete.
onRecordCreateRequest((e) => {
  const record = e.record
  const stage = String(record.get('estagio') || '').trim()
  if (!stage) return e.next()
  const permCollection = $app.findCollectionByNameOrId('permanencias_negocio')
  const entry = new Record(permCollection)
  entry.set('negocio', record.id)
  entry.set('etapa', stage)
  entry.set('entrou_em', new Date().toISOString())
  entry.set('criado_por', e.auth ? e.auth.id : null)
  $app.save(entry)
  e.next()
}, 'negocios')

onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const previousStage = String(before.get('estagio') || '').trim()
  const nextStage = String(e.record.get('estagio') || '').trim()
  if (!nextStage || previousStage === nextStage) return e.next()

  $app.runInTransaction((txApp) => {
    const permCollection = txApp.findCollectionByNameOrId('permanencias_negocio')
    const open = txApp.findRecordsByFilter(
      permCollection,
      'negocio = {:negocio} && saiu_em = ""',
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
      txApp.save(entry)
    }

    const entry = new Record(permCollection)
    entry.set('negocio', e.record.id)
    entry.set('etapa', nextStage)
    entry.set('entrou_em', now)
    entry.set('criado_por', e.auth ? e.auth.id : null)
    txApp.save(entry)

    e.next()
  })
}, 'negocios')
