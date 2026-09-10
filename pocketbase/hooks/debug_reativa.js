// DEBUG T2.07 — rota temporária para o ciclo completo da fixture:
// ?modo=criar (inativa) → ?modo=reativar (ativa, mantém) → ?modo=remover.
// REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/fixture-inativa',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'admin only' })
      }
      const modo = e.request.url.query().get('modo') || 'criar'
      const users = $app.findCollectionByNameOrId('_pb_users_auth_')

      if (modo === 'criar') {
        let fixture = null
        try {
          fixture = $app.findAuthRecordByEmail('_pb_users_auth_', 'inativo-t207@vibratto.com.br')
        } catch (_) {
          fixture = null
        }
        if (fixture) return e.json(200, { acao: 'já existe', active: fixture.get('active') })
        const novo = new Record(users)
        novo.setEmail('inativo-t207@vibratto.com.br')
        novo.setPassword('TesteInativo123!')
        novo.setVerified(true)
        novo.set('name', 'Teste Inativo T207')
        novo.set('role', 'operator')
        novo.set('active', false)
        $app.save(novo)
        return e.json(200, { acao: 'criada', active: novo.get('active') })
      }

      let fixture = null
      try {
        fixture = $app.findAuthRecordByEmail('_pb_users_auth_', 'inativo-t207@vibratto.com.br')
      } catch (_) {
        return e.json(200, { acao: 'não encontrada' })
      }

      if (modo === 'reativar') {
        fixture.set('active', true)
        $app.save(fixture)
        return e.json(200, { acao: 'reativada', active: fixture.get('active') })
      }
      if (modo === 'remover') {
        $app.delete(fixture)
        return e.json(200, { acao: 'removida' })
      }
      return e.json(400, { error: 'modo inválido' })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
