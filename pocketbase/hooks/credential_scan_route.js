// T2.06 / CA-2-001 — busca automatizada de credenciais no snapshot e histórico.
// Varre os snapshots da auditoria (estado_anterior/estado_posterior) procurando
// padrões de senha/token/chave com valor UTILIZÁVEL (não-redacted, não-vazio).
// Admin-only. Retorna { achados: N, detalhes: [...] } — o critério exige N = 0.
//
// Padrões JSVM: tudo inline no callback; finders com try/catch.

routerAdd(
  'GET',
  '/backend/v1/security/credential-scan',
  (e) => {
    const actor = e.auth
    if (!actor || actor.get('role') !== 'admin') {
      return e.json(403, { error: 'Varredura de credenciais é exclusiva de administradores.' })
    }

    // Padrões de NOME de campo sensível (normalizados).
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
    // Padrões de VALOR que indicam credencial utilizável em texto.
    const valorSuspeito =
      /(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/

    let eventos = []
    try {
      eventos = $app.findRecordsByFilter('auditoria', '', '-created', 10000, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao varrer a auditoria: ' + String(err) })
    }

    const detalhes = []
    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i]
      const blobs = [
        ['estado_anterior', String(ev.get('estado_anterior') || '')],
        ['estado_posterior', String(ev.get('estado_posterior') || '')],
      ]
      for (let b = 0; b < blobs.length; b++) {
        const campo = blobs[b][0]
        const texto = blobs[b][1]
        if (texto === '') continue
        // 1. Valor com formato de credencial real (chave de API, PEM, etc).
        if (valorSuspeito.test(texto)) {
          detalhes.push({
            evento: ev.id,
            entidade: ev.get('entidade'),
            acao: ev.get('acao'),
            campo: campo,
            motivo: 'valor com formato de credencial',
          })
          continue
        }
        // 2. Campo sensível com valor utilizável (não [REDACTED], não vazio).
        let obj = null
        try {
          obj = JSON.parse(texto)
        } catch (_) {
          obj = null
        }
        if (obj && typeof obj === 'object') {
          for (const key in obj) {
            const normalizado = key.toLowerCase().replaceAll('-', '_')
            if (
              camposSensiveis.indexOf(normalizado) !== -1 &&
              obj[key] &&
              obj[key] !== '[REDACTED]'
            ) {
              detalhes.push({
                evento: ev.id,
                entidade: ev.get('entidade'),
                acao: ev.get('acao'),
                campo: campo + '.' + key,
                motivo: 'campo sensível com valor utilizável',
              })
            }
          }
        }
      }
    }

    return e.json(200, {
      varridos: eventos.length,
      achados: detalhes.length,
      detalhes: detalhes,
      varrido_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
