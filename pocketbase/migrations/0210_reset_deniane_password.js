migrate(
  (app) => {
    // Redefinição urgente da senha do usuário deniane@vibratto.com.br para Skip@Pass
    // Operação segura e idempotente via PocketBase auth record API
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      if (user) {
        // Se a senha já for Skip@Pass, não precisa redefinir
        const jaEstaCorreta = user.validatePassword('Skip@Pass')
        if (!jaEstaCorreta) {
          user.setPassword('Skip@Pass')
          app.save(user)
        }
      }
    } catch (err) {
      console.log('Erro ao redefinir senha de deniane@vibratto.com.br:', err)
      throw err
    }
  },
  (app) => {
    // Rollback não-destrutivo: no-op para manter a integridade da conta
  },
)
