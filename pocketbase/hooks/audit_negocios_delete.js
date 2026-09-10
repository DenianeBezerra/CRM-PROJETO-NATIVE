// T2.01 / CA-2-036 — auditoria append-only do DELETE de oportunidades.
//
// Request hook (e não model hook) porque só ele tem e.auth — o ator da exclusão.
// O model hook onRecordDelete não tem contexto HTTP (e.requestInfo() lança erro).
// A gravação do evento acontece ANTES de e.next() para capturar o snapshot;
// se a exclusão falhar depois, a transação do PocketBase desfaz o conjunto —
// e o evento só persiste quando a exclusão de fato commita.
//
// Nota: o campo 'acao' da coleção auditoria (migration 0010) só aceita
// 'create' e 'update' — a migration 0020 amplia o select para incluir 'delete'.

onRecordDeleteRequest((e) => {
  const actor = e.auth
  if (!actor) {
    throw new Error('Autenticação obrigatória para excluir oportunidades.')
  }

  const before = JSON.stringify(e.record.original().publicExport())

  e.next()

  try {
    const audit = $app.findCollectionByNameOrId('auditoria')
    const event = new Record(audit)
    event.set('entidade', 'negocios')
    event.set('registro_id', e.record.id)
    event.set('acao', 'delete')
    event.set('ator_id', actor.id)
    event.set('ocorrido_em', new Date().toISOString())
    event.set('estado_anterior', before)
    event.set('estado_posterior', '')
    $app.save(event)
  } catch (err) {
    $app.logger().error('Falha ao registrar auditoria de exclusão', 'error', String(err))
  }

  return e
}, 'negocios')
