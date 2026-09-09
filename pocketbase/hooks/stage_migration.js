// Migração de oportunidades ao inativar etapa, em transação única.
// Nota: o histórico de permanência acompanha automaticamente — o save de cada
// negócio via txApp dispara o model hook onRecordUpdate (stage_dwell_history.js),
// que roda dentro da mesma transação.
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
