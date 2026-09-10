// DEBUG T2.07 — rota temporária: reativa a fixture inativa (contexto sistema),
// prova o ciclo e a remove. REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/reativa-fixture',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'admin only' })
      }
      let fixture = null
      try {
        fixture = $app.findAuthRecordByEmail('_pb_users_auth_', 'inativo-t207@vibratto.com.br')
      } catch (_) {
        return e.json(200, { acao: 'fixture não encontrada — nada a fazer' })
      }
      // Reativar
      fixture.set('active', true)
      $app.save(fixture)
      const reativada = fixture.get('active')
      // Remover (limpeza da fixture de teste)
      $app.delete(fixture)
      return e.json(200, { reativada: reativada, removida: true })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
