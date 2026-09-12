import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

type Evento = {
  tipo: string
  data: string
  titulo: string
  detalhe: string
  autor: string
}
type Timeline = {
  negocio_id: string
  titulo: string
  total: number
  truncado: boolean
  fontes_com_erro: string[]
  eventos: Evento[]
}

const BADGES: Record<string, { label: string; classe: string }> = {
  entrada: { label: 'Entrada', classe: 'bg-[#F7F5F1] text-[#374151]' },
  etapa: { label: 'Etapa', classe: 'bg-blue-50 text-blue-800' },
  formulario: { label: 'Formulário', classe: 'bg-purple-50 text-purple-800' },
  whatsapp: { label: 'WhatsApp', classe: 'bg-green-50 text-green-800' },
  email: { label: 'E-mail', classe: 'bg-amber-50 text-amber-800' },
  reuniao: { label: 'Reunião', classe: 'bg-amber-50 text-amber-800' },
  ligacao: { label: 'Ligação', classe: 'bg-amber-50 text-amber-800' },
  diagnostico: { label: 'Diagnóstico', classe: 'bg-indigo-50 text-indigo-800' },
  proposta: { label: 'Proposta', classe: 'bg-[#C9A227]/10 text-[#8a6d1a]' },
  tarefa: { label: 'Tarefa', classe: 'bg-gray-100 text-gray-700' },
  handoff: { label: 'Handoff', classe: 'bg-rose-50 text-rose-800' },
  decisao: { label: 'Decisão', classe: 'bg-emerald-50 text-emerald-800' },
  outro: { label: 'Outro', classe: 'bg-[#F7F5F1] text-[#6B7280]' },
}

const formatar = (raw: string) => {
  if (!raw) return '—'
  const d = new Date(raw.replace(' ', 'T'))
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

export default function TimelineNegocio({
  negocioId,
  titulo,
  onClose,
}: {
  negocioId: string
  titulo: string
  onClose: () => void
}) {
  const [dados, setDados] = useState<Timeline | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await pb.send<Timeline>(`/backend/v1/negocios/${negocioId}/timeline`)
        setDados(resp)
      } catch {
        setError('Não foi possível carregar a timeline desta oportunidade.')
      }
    }
    void load()
  }, [negocioId])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Timeline</h2>
            <p className="text-sm text-[#6B7280]">{titulo}</p>
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
        {dados?.fontes_com_erro && dados.fontes_com_erro.length > 0 && (
          <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
            Algumas fontes não puderam ser lidas ({dados.fontes_com_erro.join(', ')}). A timeline
            pode estar incompleta — nada foi omitido de propósito.
          </p>
        )}
        {dados?.truncado && (
          <p className="mb-4 text-xs text-[#6B7280] bg-[#F7F5F1] border p-3 rounded">
            Exibindo os {dados.total} eventos mais recentes (limite de 300).
          </p>
        )}
        {!dados ? (
          <p className="text-[#6B7280] text-sm">Carregando...</p>
        ) : dados.eventos.length === 0 ? (
          <p className="text-[#6B7280] text-sm">Nenhum evento registrado além da entrada.</p>
        ) : (
          <ol className="relative border-l border-[#E5E1D8] ml-2 space-y-4">
            {dados.eventos.map((ev, i) => {
              const badge = BADGES[ev.tipo] || BADGES.outro
              return (
                <li key={i} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-[#C9A227]"></span>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-semibold ${badge.classe}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-[#6B7280]">{formatar(ev.data)}</span>
                  </div>
                  <p className="text-sm font-medium">{ev.titulo}</p>
                  {ev.detalhe && (
                    <p className="text-xs text-[#6B7280] whitespace-pre-wrap">{ev.detalhe}</p>
                  )}
                  {ev.autor && <p className="text-xs text-[#6B7280] mt-0.5">por {ev.autor}</p>}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
