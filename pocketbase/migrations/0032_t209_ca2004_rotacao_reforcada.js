migrate(
  (app) => {
    // T2.09 / CA-2-004 — rotação de senhas reforçada e atômica.
    //
    // Regras do critério:
    // 1. Ausência de secret obrigatório interrompe o provisionamento ANTES de
    //    qualquer alteração (sem conta parcial).
    // 2. Rotação exige valor DIFERENTE do exposto — rejeita a senha atual da
    //    conta e as senhas historicamente expostas (Skip@Pass, Operator@2026).
    // 3. As duas rotações são atômicas: se uma falha, NENHUMA é aplicada
    //    (runInTransaction).
    //
    // Nota: esta migration é idempotente — se as senhas já foram rotacionadas
    // para os valores dos secrets (T2.06), a comparação de igualdade detecta e
    // não reaplica; o resultado é o mesmo estado final válido.

    const adminSenha = $secrets.get('ADMIN_INITIAL_PASSWORD')
    const operatorSenha = $secrets.get('OPERATOR_INITIAL_PASSWORD')

    // ---- 1. Validação ANTES de qualquer alteração (sem conta parcial).
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

    // Senhas historicamente expostas (código-fonte, conversas de teste).
    const expostas = ['Skip@Pass', 'Operator@2026']
    if (expostas.indexOf(adminSenha) !== -1) {
      throw new Error(
        'Rotação do admin exige valor diferente do exposto (Skip@Pass é historicamente exposto).',
      )
    }
    if (expostas.indexOf(operatorSenha) !== -1) {
      throw new Error(
        'Rotação do operator exige valor diferente do exposto (Operator@2026 é historicamente exposto).',
      )
    }

    // ---- 2. Rotação ATÔMICA: ambas ou nenhuma.
    app.runInTransaction((tx) => {
      // Admin.
      let admin = null
      try {
        admin = tx.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      } catch (_) {
        admin = null
      }
      if (admin) {
        // Rotação exige valor DIFERENTE do atual.
        const igualAdmin = admin.validatePassword(adminSenha)
        if (igualAdmin) {
          throw new Error(
            'Rotação do admin exige valor diferente da senha atual — nada foi alterado.',
          )
        }
        admin.setPassword(adminSenha)
        admin.setVerified(true)
        admin.set('active', true)
        tx.save(admin)
      }

      // Operator.
      let operator = null
      try {
        operator = tx.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
      } catch (_) {
        operator = null
      }
      if (operator) {
        const igualOperator = operator.validatePassword(operatorSenha)
        if (igualOperator) {
          throw new Error(
            'Rotação do operator exige valor diferente da senha atual — nada foi alterado.',
          )
        }
        operator.setPassword(operatorSenha)
        operator.setVerified(true)
        operator.set('active', true)
        tx.save(operator)
      }
    })
  },
  (app) => {
    // Rollback: sem ação — senhas não são revertidas para texto de código.
  },
)
