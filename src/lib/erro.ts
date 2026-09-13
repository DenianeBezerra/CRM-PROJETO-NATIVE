// Padrão geral (CEO 16/09): toda mensagem de erro exibida ao usuário contém o
// motivo informado pelo servidor e, quando aplicável, o que fazer. Mensagem
// genérica não existe em nenhum módulo.
//
// Uso:
//   import { msgErro } from '@/lib/erro'
//   toast({ title: 'Não foi possível baixar', description: msgErro(e), variant: 'destructive' })

type ErroPocketBase = {
  response?: {
    data?: { error?: string; message?: string; data?: Record<string, { message?: string }> }
  }
  message?: string
}

export function msgErro(e: unknown, fallback?: string): string {
  const err = e as ErroPocketBase
  const d = err?.response?.data
  const direto = d?.error || d?.message
  if (direto) return direto
  // PocketBase pode aninhar erros de validação por campo em data.data
  const campos = d?.data
  if (campos && typeof campos === 'object') {
    const msgs = Object.values(campos)
      .map((v) => v?.message)
      .filter(Boolean)
    if (msgs.length) return msgs.join(' · ')
  }
  return err?.message || fallback || 'Erro inesperado — tente novamente.'
}
