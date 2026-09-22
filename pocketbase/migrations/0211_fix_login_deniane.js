migrate(
  (app) => {
    // Correção do login quebrado: redefinição idempotente da senha documentada
    // (Skip@Pass, mesma da migração 0210) e garantia de conta ativa/admin para
    // deniane@vibratto.com.br. A API retornava 400 "Failed to authenticate"
    // para as credenciais canônicas — sem isso o login nunca redireciona.
    const EMAIL = 'deniane@vibratto.com.br'
    const candidates = ['users', '_pb_users_auth_']
    let user = null
    for (const col of candidates) {
      try {
        user = app.findAuthRecordByEmail(col, EMAIL)
        if (user) break
      } catch (e) {
        // tenta o próximo nome de coleção
      }
    }
    if (!user) {
      console.log('[0211] usuario nao encontrado:', EMAIL)
      return
    }
    let precisaSalvar = false
    try {
      if (!user.validatePassword('Skip@Pass')) {
        user.setPassword('Skip@Pass')
        precisaSalvar = true
      }
    } catch (e) {
      user.setPassword('Skip@Pass')
      precisaSalvar = true
    }
    try {
      if (user.get('active') === false) {
        user.set('active', true)
        precisaSalvar = true
      }
    } catch (e) {
      // campo active pode não existir
    }
    try {
      if (user.get('role') !== 'admin') {
        user.set('role', 'admin')
        precisaSalvar = true
      }
    } catch (e) {
      // campo role pode não existir
    }
    if (precisaSalvar) {
      app.save(user)
      console.log('[0211] senha/conta de deniane@vibratto.com.br garantidas')
    } else {
      console.log('[0211] nada a fazer — credenciais já corretas')
    }
  },
  (app) => {
    // Rollback não-destrutivo: no-op (não revertemos senha de produção)
  },
)
