// T3.08 — SPEC-3-007 (CA-3-024): tarefa atribuída gera notificação para o
// responsável (se ≠ autor). onRecordAfterCreateSuccess dispara APÓS a gravação
// bem-sucedida — evita o problema do model hook pré-save (notificação não
// criada nas provas com onRecordCreate).
// Runtime goja: lógica inline (AP-0200).
onRecordAfterCreateSuccess((e) => {
  var responsavel = String(e.record.get('responsavel') || '')
  var criadoPor = String(e.record.get('criado_por') || '')
  if (!responsavel || responsavel === criadoPor) return
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
    $app.logger().warn('T308 notificação de tarefa falhou', 'err', String(err))
  }
}, 'tarefas')
