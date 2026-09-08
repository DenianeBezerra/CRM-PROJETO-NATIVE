// Captura append-only de alterações do CRM.
// Escopo deliberado: clientes, negocios, etapas_negocio e interacoes.

onRecordCreateRequest(
  (e) => {
    e.next()
    try {
      const actor = e.auth
      if (!actor) return
      const audit = $app.findCollectionByNameOrId('auditoria')
      const event = new Record(audit)
      event.set('entidade', e.record.collection().name)
      event.set('registro_id', e.record.id)
      event.set('acao', 'create')
      event.set('ator_id', actor.id)
      event.set('ocorrido_em', new Date().toISOString())
      event.set('estado_anterior', '')
      event.set('estado_posterior', JSON.stringify(e.record.publicExport()))
      $app.save(event)
    } catch (err) {
      $app.logger().error('Falha ao registrar auditoria de criação', 'error', String(err))
    }
    return e
  },
  'clientes',
  'negocios',
  'etapas_negocio',
  'interacoes',
)

onRecordUpdateRequest(
  (e) => {
    const actor = e.auth
    const before = e.record.original().publicExport()
    e.next()
    try {
      if (!actor) return
      const audit = $app.findCollectionByNameOrId('auditoria')
      const event = new Record(audit)
      event.set('entidade', e.record.collection().name)
      event.set('registro_id', e.record.id)
      event.set('acao', 'update')
      event.set('ator_id', actor.id)
      event.set('ocorrido_em', new Date().toISOString())
      event.set('estado_anterior', JSON.stringify(before))
      event.set('estado_posterior', JSON.stringify(e.record.publicExport()))
      $app.save(event)
    } catch (err) {
      $app.logger().error('Falha ao registrar auditoria de atualização', 'error', String(err))
    }
    return e
  },
  'clientes',
  'negocios',
  'etapas_negocio',
  'interacoes',
)
