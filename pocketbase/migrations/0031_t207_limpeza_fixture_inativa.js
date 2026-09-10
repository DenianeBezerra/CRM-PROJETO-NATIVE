migrate(
  (app) => {
    // T2.07 — limpeza final: remove a fixture de teste da autenticação inativa,
    // caso ela tenha sido recriada pela rota de debug antes da convergência.
    // Idempotente.
    let fixture = null
    try {
      fixture = app.findAuthRecordByEmail('_pb_users_auth_', 'inativo-t207@vibratto.com.br')
    } catch (_) {
      fixture = null
    }
    if (fixture) app.delete(fixture)
  },
  (app) => {
    // Rollback: nada a fazer.
  },
)
