// Padrão geral (CEO 16/09): registros de prova nunca aparecem como dados reais.
// Enquanto prova e produção coexistirem no mesmo ambiente, a marcação é
// OBRIGATÓRIA na interface — em qualquer módulo.
//
// Uso:
//   import { ehProva, tagProva } from '@/lib/prova'
//   {ehProva(nome) && tagProva}
//
// Detecção por marcadores canônicos usados nas limpezas de prova do CRM
// (migrations 0196 e anteriores): prefixo [PROVA, marcadores T201/T2xx/T3xx,
// "prova", "teste", "fixture", "debug". Marcadores minúsculos exigem palavra
// isolada para não marcar conteúdo legítimo (ex.: "teste A/B" de marketing é
// suspeito, mas "atestado" não é).

const MARCADORES_FORTES = ['[prova', '[teste', '[fixture', '[debug']
const PALAVRAS_ISOLADAS = ['prova', 'provas', 'teste', 'testes', 'fixture', 'fixtures', 'debug']

export function ehProva(...campos: (string | undefined | null)[]): boolean {
  for (const campo of campos) {
    const s = String(campo || '').toLowerCase()
    if (!s) continue
    for (const m of MARCADORES_FORTES) {
      if (s.includes(m)) return true
    }
    for (const p of PALAVRAS_ISOLADAS) {
      const re = new RegExp(`(^|[^a-zà-ú])${p}([^a-zà-ú]|$)`, 'i')
      if (re.test(s)) return true
    }
  }
  return false
}

export const TAG_PROVA = 'PROVA — registro de teste'

export function tagProva(...campos: (string | undefined | null)[]) {
  if (!ehProva(...campos)) return null
  return (
    <span
      className="text-[10px] rounded-full px-2 py-0.5 font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide"
      title="Registro de teste — não é dado real. Será removido na limpeza."
    >
      Prova
    </span>
  )
}
