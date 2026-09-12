// T3.08 — SPEC-3-007 (CA-3-024): tarefa atribuída gera notificação para o
// responsável (se ≠ autor). Model hook: dispara também para saves internos
// (lição T2.06 — request hooks não disparam para $app.save de sistema).
// Runtime goja: lógica inline (AP-0200).
onRecordCreate((e) => {
  try {
    var auditD = $app.findCollectionByNameOrId('auditoria')
    var evD = new Record(auditD)
    evD.set('entidade', 'debug_t308')
    evD.set('registro_id', e.record.id)
    evD.set('acao', 'hook_disparou')
    evD.set('ator_id', '')
    evD.set('ocorrido_em', new Date().toISOString())
    evD.set('estado_anterior', '')
    evD.set('estado_posterior', 'resp=' + String(e.record.get('responsavel') || ''))
    $app.save(evD)
  } catch (_) {}
  var responsavel = String(e.record.get('responsavel') || '')
  var criadoPor = String(e.record.get('criado_por') || '')
  $app
    .logger()
    .info('T308 tarefa hook', 'resp', responsavel, 'criador', criadoPor, 'id', e.record.id)
  if (!responsavel || responsavel === criadoPor) {
    e.next()
    return
  }
  try {
    var notCol = $app.findCollectionByNameOrId('notificacoes')
    var n = new Record(notCol)
    n.set('usuario', responsavel)
    n.set('tipo', 'tarefa_atribuida')
    n.set('origem', String(e.record.get('negocio') || ''))
    n.set('origem_tarefa', e.record.id)
    n.set('lida', false)
    $app.save(n)
  } catch (err) {
    // Diagnóstico: erro visível em auditoria (sem acesso a logs por API).
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'debug_t308')
      ev.set('registro_id', e.record.id)
      ev.set('acao', 'erro_notificacao')
      ev.set('ator_id', '')
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', String(err).slice(0, 500))
      $app.save(ev)
    } catch (_) {}
  }
  e.next()
}, 'tarefas')
