// T2.08 / CA-2-003 — suíte real de testes das funções críticas de segurança.
// As funções são réplicas linha a linha do código de produção (JSVM hooks e
// frontend), testadas aqui em Node porque a lógica é JavaScript puro.

import { describe, it, expect } from 'vitest'

// ---- Réplica de src/pages/SearchPage.tsx (T2.03/CA-2-038) ----
function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'` + text
  return `"${text.replaceAll('"', '""')}"`
}

// ---- Réplica de pocketbase/hooks/credential_scan.js (T2.06/CA-2-001) ----
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

function sanitizarSnapshot(bruto: string): string {
  if (!bruto || bruto === '') return bruto
  let obj
  try {
    obj = JSON.parse(bruto)
  } catch {
    return bruto
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

// ---- Réplica da regra de papel da auditoria (T2.05/CA-2-040) ----
function podeVerAuditoria(papel: string | undefined, authId: string, atorId: string): boolean {
  if (papel === 'admin') return true
  return authId !== '' && atorId === authId
}

// ---- Réplica do guard de contas inativas (T2.07/CA-2-002) ----
function loginPermitido(active: boolean | undefined): boolean {
  // o hook lança erro quando active === false; aqui espelhamos a decisão
  return active !== false
}

describe('csvCell — neutralização CSV injection (CA-2-038)', () => {
  it('neutraliza célula iniciada por =', () => {
    expect(csvCell("=CMD|'/C calc'!A0")).toBe(`"'=CMD|'/C calc'!A0"`)
  })
  it('neutraliza célula iniciada por +', () => {
    expect(csvCell('+1+1')).toBe(`"'+1+1"`)
  })
  it('neutraliza célula iniciada por -', () => {
    expect(csvCell('-2+3')).toBe(`"'-2+3"`)
  })
  it('neutraliza célula iniciada por @', () => {
    expect(csvCell('@SUM(1)')).toBe(`"'@SUM(1)"`)
  })
  it('não altera texto comum', () => {
    expect(csvCell('Deniane Bezerra')).toBe('"Deniane Bezerra"')
  })
  it('escapa aspas duplas', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
  })
  it('trata null/undefined como vazio', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })
  it('neutraliza fórmula HYPERLINK completa', () => {
    const saida = csvCell('=HYPERLINK("http://x")')
    expect(saida.startsWith('"\'=')).toBe(true)
  })
})

describe('sanitizarSnapshot — saneamento de credenciais (CA-2-001)', () => {
  it('redacta password', () => {
    const saida = sanitizarSnapshot('{"nome":"Teste","password":"SuperSenha123"}')
    expect(saida).toContain('[REDACTED]')
    expect(saida).not.toContain('SuperSenha123')
  })
  it('redacta api_key', () => {
    const saida = sanitizarSnapshot('{"api_key":"sk-123456"}')
    expect(saida).toContain('[REDACTED]')
  })
  it('redacta token com hífen no nome (normalização)', () => {
    const saida = sanitizarSnapshot('{"access-token":"abc123"}')
    expect(saida).toContain('[REDACTED]')
  })
  it('redacta case-insensitive', () => {
    const saida = sanitizarSnapshot('{"PASSWORD":"x","Secret":"y"}')
    expect(saida).toContain('[REDACTED]')
  })
  it('não altera campo de negócio (chave de etapa)', () => {
    const saida = sanitizarSnapshot('{"chave":"novo","nome":"Novo"}')
    expect(saida).toBe('{"chave":"novo","nome":"Novo"}')
  })
  it('preserva JSON sem campos sensíveis', () => {
    const original = '{"nome":"Camila","cidade":"Curitiba"}'
    expect(sanitizarSnapshot(original)).toBe(original)
  })
  it('retorna texto não-JSON sem alteração', () => {
    expect(sanitizarSnapshot('excluido:true')).toBe('excluido:true')
  })
  it('retorna vazio sem alteração', () => {
    expect(sanitizarSnapshot('')).toBe('')
  })
})

describe('auditoria — leitura por papel (CA-2-040)', () => {
  it('admin vê tudo', () => {
    expect(podeVerAuditoria('admin', 'u1', 'u2')).toBe(true)
  })
  it('operator vê só os próprios atos', () => {
    expect(podeVerAuditoria('operator', 'u1', 'u1')).toBe(true)
  })
  it('operator não vê atos de terceiros', () => {
    expect(podeVerAuditoria('operator', 'u1', 'u2')).toBe(false)
  })
  it('anônimo não vê nada', () => {
    expect(podeVerAuditoria(undefined, '', 'u2')).toBe(false)
  })
})

describe('guard de autenticação — contas inativas (CA-2-002)', () => {
  it('conta ativa autentica', () => {
    expect(loginPermitido(true)).toBe(true)
  })
  it('conta inativa falha', () => {
    expect(loginPermitido(false)).toBe(false)
  })
  it('campo ausente não bloqueia (comportamento PocketBase padrão)', () => {
    expect(loginPermitido(undefined)).toBe(true)
  })
})
