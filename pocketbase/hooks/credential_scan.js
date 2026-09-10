// T2.06 / CA-2-001 — saneamento de snapshots da auditoria.
// Antes de qualquer evento de auditoria ser gravado, campos com nome sensível
// (password, token, secret, key, credential...) têm o valor substituído por
// "[REDACTED]". Assim o snapshot nunca carrega credencial utilizável, hoje ou
// no futuro — independentemente do registro de origem.
//
// Padrões JSVM: funções inline nos callbacks, sem referências a top-level.

// Campos que NUNCA entram em snapshot com valor real.
const CAMPOS_SENSIVEIS = [
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

function sanitizarSnapshot(bruto) {
  if (!bruto || bruto === '') return bruto
  let obj
  try {
    obj = JSON.parse(bruto)
  } catch (_) {
    return bruto // não é JSON — retorna como está
  }
  if (!obj || typeof obj !== 'object') return bruto
  let alterado = false
  for (const campo in obj) {
    const normalizado = campo.toLowerCase().replaceAll('-', '_')
    if (CAMPOS_SENSIVEIS.indexOf(normalizado) !== -1 && obj[campo]) {
      obj[campo] = '[REDACTED]'
      alterado = true
    }
  }
  return alterado ? JSON.stringify(obj) : bruto
}

onRecordCreateRequest((e) => {
  e.record.set('estado_anterior', sanitizarSnapshot(e.record.get('estado_anterior')))
  e.record.set('estado_posterior', sanitizarSnapshot(e.record.get('estado_posterior')))
  e.next()
}, 'auditoria')

onRecordUpdateRequest((e) => {
  // Auditoria é append-only — update é bloqueado por regra; este hook é defesa
  // em profundidade caso a regra mude.
  e.record.set('estado_anterior', sanitizarSnapshot(e.record.get('estado_anterior')))
  e.record.set('estado_posterior', sanitizarSnapshot(e.record.get('estado_posterior')))
  e.next()
}, 'auditoria')
