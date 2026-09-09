migrate(
  (app) => {
    // Fixture da T9.2: conta operator para teste de RBAC (CA-1-12F)
    // e reativação da etapa "proposta" (resíduo dos testes da T8.1).
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let operator = null
    try {
      operator = app.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
    } catch (_) {
      operator = null
    }
    if (!operator) {
      operator = new Record(users)
      operator.setEmail('operator@vibratto.com.br')
      operator.setPassword('Operator@2026')
      operator.setVerified(true)
      operator.set('name', 'Operador Vibratto')
      operator.set('role', 'operator')
      operator.set('active', true)
      app.save(operator)
    }

    // Reativa a etapa "proposta" se estiver inativa.
    const stages = app.findCollectionByNameOrId('etapas_negocio')
    const proposta = app.findRecordsByFilter(stages, "chave = 'proposta'", '', 1, 0)
    if (proposta.length > 0 && proposta[0].getBool('ativa') !== true) {
      proposta[0].set('ativa', true)
      app.save(proposta[0])
    }
  },
  (app) => {
    // Rollback: remove operator se criado por esta migration.
    try {
      const operator = app.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
      app.delete(operator)
    } catch (_) {}
    // Etapa "proposta" permanece ativa (estado correto do funil).
  },
)
