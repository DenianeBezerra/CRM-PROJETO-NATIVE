import React, { useEffect, useState } from 'react'
import { X, AtSign } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.08 — SPEC-3-007: comentários da oportunidade (modal no menu Mais ⌄).
// Lista cronológica + criação com menção @Nome (resolvida server-side).
// Append-only: sem edição nem exclusão (padrão das interações).

type Comentario = {
  id: string
  autor_nome: string
  texto: string
  mencoes_nomes: string[]
  created: string
}

export default function ComentariosNegocio({
  negocio,
  onClose,
}: {
  negocio: { id: string; titulo: string }
  onClose: () => void
}) {
  const { toast } = useToast()
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await pb.send<{ total: number; itens: Comentario[] }>(
        `/backend/v1/negocios/${negocio.id}/comentarios`,
        {},
      )
      setComentarios(r.itens || [])
    } catch {
      setError('Não foi possível carregar os comentários.')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const salvar = async () => {
    setError('')
    const t = texto.trim()
    if (!t) return setError('O comentário não pode ficar vazio.')
    if (t.length > 2000) return setError('Comentário excede 2000 caracteres.')
    setSaving(true)
    try {
      await pb.send(`/backend/v1/negocios/${negocio.id}/comentarios`, {
        method: 'POST',
        body: { texto: t },
      })
      toast({ title: 'Comentário registrado' })
      setTexto('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível registrar o comentário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Comentários</h2>
            <p className="text-sm text-[#6B7280]">{negocio.titulo}</p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {error}
          </p>
        )}
        <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
          <label className="block text-sm font-medium">
            Novo comentário
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Escreva aqui. Use @Nome para mencionar alguém do time."
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
              <AtSign className="w-3 h-3" /> Mencione com @Nome — a pessoa recebe uma notificação.
            </p>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Comentar'}
            </button>
          </div>
        </div>
        {comentarios.length === 0 ? (
          <p className="text-[#6B7280] text-sm">Nenhum comentário nesta oportunidade.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Comentários ({comentarios.length})</p>
            {comentarios.map((c) => (
              <div key={c.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold">{c.autor_nome || 'Usuário'}</span>
                  <span className="text-[10px] text-[#6B7280]">
                    {new Date(c.created.replace(' ', 'T')).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
                {c.mencoes_nomes.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {c.mencoes_nomes.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] rounded-full bg-[#F7F5F1] border border-[#C9A227]/40 px-2 py-0.5 font-semibold text-[#A8862B]"
                      >
                        @{m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
