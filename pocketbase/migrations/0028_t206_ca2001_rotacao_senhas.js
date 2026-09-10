migrate(
  (app) => {
    // T2.06 / CA-2-001 — rotação das senhas fixas do código-fonte.
    // As senhas passam a vir de secrets do ambiente ($secrets.get); se um secret
    // não existir, a migration FALHA explicitamente sem criar conta parcial
    // (regra da SPEC-2-001/CA-2-004 aplicada preventivamente).
    //
    // IMPORTANTE: senhas antigas (Skip@Pass, Operator@2026) ficam obsoletas —
    // estavam expostas no código e em conversas de teste.

    const adminSenha = $secrets.get('ADMIN_INITIAL_PASSWORD')
    const operatorSenha = $secrets.get('OPERATOR_INITIAL_PASSWORD')

    if (!adminSenha || adminSenha.length < 8) {
      throw new Error(
        'Secret ADMIN_INITIAL_PASSWORD ausente ou curto — provisionamento interrompido.',
      )
    }
    if (!operatorSenha || operatorSenha.length < 8) {
      throw new Error(
        'Secret OPERATOR_INITIAL_PASSWORD ausente ou curto — provisionamento interrompido.',
      )
    }

    // Rotação do admin.
    let admin = null
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
    } catch (_) {
      admin = null
    }
    if (admin) {
      admin.setPassword(adminSenha)
      admin.setVerified(true)
      admin.set('active', true)
      app.save(admin)
    }

    // Rotação do operator.
    let operator = null
    try {
      operator = app.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
    } catch (_) {
      operator = null
    }
    if (operator) {
      operator.setPassword(operatorSenha)
      operator.setVerified(true)
      operator.set('active', true)
      app.save(operator)
    }
  },
  (app) => {
    // Rollback: sem ação — senhas não são revertidas para texto de código.
  },
)
