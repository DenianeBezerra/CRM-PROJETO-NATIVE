// Migração de oportunidades ao inativar etapa: valida tudo antes de qualquer escrita.
onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const wasActive = before.get('ativa') === true
  const willBeInactive = e.record.get('ativa') === false
  if (!wasActive || !willBeInactive) return e.next()

  const stageKey = e.record.get('chave')
  const targetKey = String(e.record.get('migracao_destino') || '').trim()
  const stages = $app.findCollectionByNameOrId('etapas_negocio')
  const deals = $app.findCollectionByNameOrId('negocios')
  const target = targetKey
    ? $app.findRecordsByFilter(stages, 'chave = {:target} && ativa = true', '', 1, 0, {
        target: targetKey,
      })
    : []
  const affected = $app.findRecordsByFilter(deals, 'estagio = {:stage}', '', 5000, 0, {
    stage: stageKey,
  })

  if (affected.length > 0) {
    if (!targetKey || targetKey === stageKey || !target || target.length === 0) {
      throw new Error('Etapa em uso exige um destino ativo diferente para migração.')
    }
    for (const deal of affected) deal.set('estagio', targetKey)
    for (const deal of affected) $app.save(deal)
  }
  e.next()
  try {
    const audit = $app.findCollectionByNameOrId('auditoria')
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
    $app.save(event)
  } catch (err) {
    $app.logger().error('Falha ao registrar auditoria de migração de etapa', 'error', String(err))
  }
}, 'etapas_negocio')
