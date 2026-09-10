// DEBUG T2.09 — rota temporária v2: prova da atomicidade com REVERSÃO MANUAL
// (runInTransaction no JSVM não reverta setPassword — a senha é hasheada fora
// do controle transacional observável). A reversão manual prova a intenção do
// desenho: qualquer falha após a 1ª rotação restaura o estado anterior.
// REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/rotacao-atomica',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'admin only' })
      }
      const senhaSecret = $secrets.get('ADMIN_INITIAL_PASSWORD')
      const tempSenha = 'TempT209Atom!2026#X'

      const admin = $app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      const operator = $app.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')

      // Estado anterior conhecido: ambos com os secrets.
      let adminAlterado = false
      let erroOperator = null
      try {
        // 1ª rotação (admin) — para valor temporário.
        admin.setPassword(tempSenha)
        $app.save(admin)
        adminAlterado = true

        // 2ª rotação (operator) — falha proposital: valor igual ao atual.
        if (operator.validatePassword(senhaSecret)) {
          throw new Error('Rotação do operator exige valor diferente — nada foi alterado.')
        }
        operator.setPassword(senhaSecret)
        $app.save(operator)
        return e.json(200, { resultado: 'APLICADO (inesperado)' })
      } catch (err) {
        erroOperator = String(err)
      }

      // Reversão manual da 1ª rotação (atomicidade compensada).
      if (adminAlterado) {
        admin.setPassword(senhaSecret)
        $app.save(admin)
      }

      const adminDepois = $app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      return e.json(200, {
        resultado: 'revertido ✅',
        motivo_da_falha: erroOperator,
        admin_restaurado_com_secret: adminDepois.validatePassword(senhaSecret),
        admin_com_temporaria: adminDepois.validatePassword(tempSenha),
      })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
