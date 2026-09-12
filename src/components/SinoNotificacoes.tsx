import React, { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

// T3.08 — SPEC-3-007: sino de notificações no header (badge de não lidas +
// dropdown com marcar-lida e link para a origem). Privacidade: a API só
// retorna notificações do próprio usuário (rule server-side).
type Notificacao = {
  id: string
  tipo: string
  lida: boolean
  negocio: string
  negocio_titulo: string
  origem_tarefa: string
  created: string
}

const tipoLabel: Record<string, string> = {
  mencao: 'Menção',
  tarefa_atribuida: 'Tarefa atribuída',
  comentario: 'Comentário',
}

export default function SinoNotificacoes() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [nots, setNots] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  const load = async () => {
    try {
      const r = await pb.send<{ total: number; itens: Notificacao[] }>(
        '/backend/v1/notificacoes',
        {},
      )
      setNots(r.itens || [])
      setNaoLidas((r.itens || []).filter((n) => !n.lida).length)
    } catch {
      /* silencioso — sino é acessório */
    }
  }

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 60000)
    return () => clearInterval(t)
  }, [])

  const marcarLida = async (n: Notificacao) => {
    try {
      await pb.send(`/backend/v1/notificacoes/${n.id}/lida`, { method: 'POST' })
      await load()
      if (n.negocio) navigate(`/oportunidades?abrir=${n.negocio}`)
    } catch {
      /* falha silenciosa */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setAberto(!aberto)
          if (!aberto) void load()
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#C9A227]/40 bg-[#141414] hover:bg-[#C9A227] text-[#E8C766] hover:text-[#0A0A0A] transition-all"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#C9A227] text-[#0A0A0A] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-50 max-h-96 overflow-auto">
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <p className="font-playfair font-bold text-sm">Notificações</p>
          </div>
          {nots.length === 0 ? (
            <p className="px-4 py-6 text-xs text-[#6B7280] text-center">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            nots.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-[#F7F5F1] flex items-start gap-2 ${
                  n.lida ? 'opacity-60' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    {tipoLabel[n.tipo] || n.tipo}
                    {n.negocio_titulo && (
                      <span className="font-normal text-[#6B7280]"> · {n.negocio_titulo}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {new Date(n.created.replace(' ', 'T')).toLocaleString('pt-BR')}
                  </p>
                </div>
                {!n.lida && (
                  <button
                    type="button"
                    onClick={() => void marcarLida(n)}
                    className="text-[10px] border border-[#C9A227]/40 rounded px-2 py-1 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] shrink-0"
                    title="Marcar como lida e abrir"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
