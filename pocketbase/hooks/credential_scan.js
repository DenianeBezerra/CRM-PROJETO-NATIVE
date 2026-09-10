// T2.06 / CA-2-001 — saneamento de snapshots da auditoria.
// Antes de qualquer evento de auditoria ser gravado, campos com nome sensível
// (password, token, secret, key, credential...) têm o valor substituído por
// "[REDACTED]". Assim o snapshot nunca carrega credencial utilizável, hoje ou
// no futuro — independentemente do registro de origem.
//
// Padrões JSVM: TODA a lógica inline no callback — funções top-level não são
// visíveis dentro de callbacks (lição aplicada de T2.01/T2.04).

onRecordCreateRequest((e) => {
  const camposSensiveis = [
    'password',
    'passwordhash',
    'tokenkey',
    'token',
    'secret',
    'app_secret',
    'appkey',
    'api_key',
    'apikey',
    'credential',
    'credentials',
    'private_key',
    'privatekey',
    'access_token',
    'refresh_token',
    'client_secret',
  ]

  const sanitizar = function (bruto) {
    if (!bruto || bruto === '') return bruto
    let obj
    try {
      obj = JSON.parse(bruto)
    } catch (_) {
      return bruto
    }
    if (!obj || typeof obj !== 'object') return bruto
    let alterado = false
    for (const campo in obj) {
      const normalizado = campo.toLowerCase().replaceAll('-', '_')
      if (camposSensiveis.indexOf(normalizado) !== -1 && obj[campo]) {
        obj[campo] = '[REDACTED]'
        alterado = true
      }
    }
    return alterado ? JSON.stringify(obj) : bruto
  }

  e.record.set('estado_anterior', sanitizar(e.record.get('estado_anterior')))
  e.record.set('estado_posterior', sanitizar(e.record.get('estado_posterior')))
  e.next()
}, 'auditoria')

onRecordUpdateRequest((e) => {
  // Auditoria é append-only — update é bloqueado por regra; este hook é defesa
  // em profundidade caso a regra mude.
  const camposSensiveis = [
    'password',
    'passwordhash',
    'tokenkey',
    'token',
    'secret',
    'app_secret',
    'appkey',
    'api_key',
    'apikey',
    'credential',
    'credentials',
    'private_key',
    'privatekey',
    'access_token',
    'refresh_token',
    'client_secret',
  ]

  const sanitizar = function (bruto) {
    if (!bruto || bruto === '') return bruto
    let obj
    try {
      obj = JSON.parse(bruto)
    } catch (_) {
      return bruto
    }
    if (!obj || typeof obj !== 'object') return bruto
    let alterado = false
    for (const campo in obj) {
      const normalizado = campo.toLowerCase().replaceAll('-', '_')
      if (camposSensiveis.indexOf(normalizado) !== -1 && obj[campo]) {
        obj[campo] = '[REDACTED]'
        alterado = true
      }
    }
    return alterado ? JSON.stringify(obj) : bruto
  }

  e.record.set('estado_anterior', sanitizar(e.record.get('estado_anterior')))
  e.record.set('estado_posterior', sanitizar(e.record.get('estado_posterior')))
  e.next()
}, 'auditoria')
