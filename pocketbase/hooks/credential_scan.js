// T2.06 / CA-2-001 — saneamento de snapshots da auditoria.
// Campos com nome sensível (password, token, secret, key...) têm o valor
// substituído por "[REDACTED]" antes do evento ser persistido.
//
// LIÇÃO T2.06: a auditoria é gravada pelos hooks de auditoria via $app.save()
// (contexto sistema, sem request HTTP) — request hooks NÃO disparam para esses
// saves. Por isso o saneamento usa MODEL hooks (onRecordCreate/onRecordUpdate),
// que disparam em qualquer save, inclusive interno.
//
// Padrões JSVM: TODA a lógica inline no callback.

onRecordCreate((e) => {
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

onRecordUpdate((e) => {
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
