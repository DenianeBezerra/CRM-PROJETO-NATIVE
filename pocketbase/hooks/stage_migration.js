// Migração de oportunidades ao inativar etapa, em transação única.
onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const wasActive = before.get('ativa') === true
  const willBeInactive = e.record.get('ativa') === false
  if (!wasActive || !willBeInactive) return e.next()

  const stageKey = e.record.get('chave')
  const targetKey = String(e.record.get('migracao_destino') || '').trim()

  $app.runInTransaction((txApp) => {
    const stages = txApp.findCollectionByNameOrId('etapas_negocio')
    const deals = txApp.findCollectionByNameOrId('negocios')
    const target = targetKey
      ? txApp.findRecordsByFilter(stages, 'chave = {:target} && ativa = true', '', 1, 0, {
          target: targetKey,
        })
      : []
    const affected = txApp.findRecordsByFilter(deals, 'estagio = {:stage}', '', 5000, 0, {
      stage: stageKey,
    })

    if (affected.length > 0) {
      if (!targetKey || targetKey === stageKey || !target || target.length === 0) {
        throw new Error('Etapa em uso exige um destino ativo diferente para migração.')
      }
      if (targetKey === 'fechado_ganho' || targetKey === 'fechado_perdido') {
        throw new Error('Migração não pode usar um estado final como destino.')
      }
      for (const deal of affected) {
        // Histórico de permanência acompanha a migração na mesma transação.
        const permCollection = txApp.findCollectionByNameOrId('permanencias_negocio')
        const open = txApp.findRecordsByFilter(
          permCollection,
          'negocio = {:negocio} && saiu_em = ""',
          '-created',
          2,
          0,
          { negocio: deal.id },
        )
        const now = new Date().toISOString()
        if (open.length === 1) {
          const entry = open[0]
          const entered = new Date(entry.get('entrou_em'))
          const duration = Math.max(0, Math.floor((Date.now() - entered.getTime()) / 1000))
          entry.set('saiu_em', now)
          entry.set('duracao_segundos', duration)
          txApp.save(entry)
        }
        const entry = new Record(permCollection)
        entry.set('negocio', deal.id)
        entry.set('etapa', targetKey)
        entry.set('entrou_em', now)
        entry.set('criado_por', e.auth ? e.auth.id : null)
        txApp.save(entry)

        deal.set('estagio', targetKey)
        txApp.save(deal)
      }
    }

    e.next()

    const audit = txApp.findCollectionByNameOrId('auditoria')
    const event = new Record(audit)
    event.set('entidade', 'etapas_negocio')
    event.set('registro_id', e.record.id)
    event.set('acao', 'update')
    event.set('ator_id', e.auth.id)
    event.set('ocorrido_em', new Date().toISOString())
    event.set(
      'estado_anterior',
      JSON.stringify({ ativa: true, chave: stageKey, oportunidades: affected.length }),
    )
    event.set(
      'estado_posterior',
      JSON.stringify({
        ativa: false,
        chave: stageKey,
        destino: targetKey,
        oportunidades: affected.length,
      }),
    )
    txApp.save(event)
  })
}, 'etapas_negocio')
