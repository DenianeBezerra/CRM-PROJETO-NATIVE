// T2.15 — CA-2-010: tentativa negada gera evento append-only na auditoria.
// Quando o request hook de avanço (qualificacao_avanco_rules) ou de resultado
// (outcome_rules) bloqueia uma mudança de etapa, o PocketBase aborta ANTES de
// qualquer model hook — então capturamos a negativa aqui, num request hook
// próprio registrado ANTES dos hooks de regra (ordem de registro = ordem de
// execução para o mesmo evento). Se a regra bloquear (throw), este hook já
// registrou a tentativa com ator, data e snapshot.
//
// Nota de ordem: hooks do MESMO tipo executam na ordem em que os arquivos são
// carregados (alfabética por padrão no PocketBase). "audit_negadas" vem antes
// de "outcome_rules" e "qualificacao_avanco_rules" alfabeticamente, garantindo
// que o registro aconteça antes do throw.

onRecordUpdateRequest((e) => {
  const etapaNova = String(e.record.get('estagio') || '').trim()
  const etapaAntes = String(e.record.original().get('estagio') || '').trim()

  // Só interessa quando a etapa está mudando.
  if (!etapaNova || etapaNova === etapaAntes) {
    return e.next()
  }

  // Delega: se nenhuma regra bloquear, nada é registrado aqui.
  try {
    e.next()
  } catch (err) {
    // Tentativa NEGADA: registra evento append-only com ator, data e snapshots.
    try {
      const actor = e.auth
      if (actor) {
        const audit = $app.findCollectionByNameOrId('auditoria')
        const event = new Record(audit)
        event.set('entidade', 'negocios')
        event.set('registro_id', e.record.id)
        event.set('acao', 'negado')
        event.set('ator_id', actor.id)
        event.set('ocorrido_em', new Date().toISOString())
        event.set('estado_anterior', JSON.stringify({ estagio: etapaAntes }))
        event.set(
          'estado_posterior',
          JSON.stringify({
            estagio_tentado: etapaNova,
            motivo: String(err && err.message ? err.message : err),
          }),
        )
        $app.save(event)
      }
    } catch (auditErr) {
      $app.logger().error('Falha ao registrar tentativa negada', 'error', String(auditErr))
    }
    // Re-propaga o erro original: a negativa continua valendo.
    throw err
  }
  return e
}, 'negocios')
