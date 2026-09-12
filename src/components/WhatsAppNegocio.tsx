import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Interacao = {
  id: string
  direcao: string
  resultado: string
  resumo: string
  contato: string
  responsavel: string
  proxima_acao_descricao: string
  proxima_acao_em: string
  created: string
}
type Oportunidade = { id: string; titulo: string }

const DIRECOES: [string, string][] = [
  ['entrada', 'Recebida (cliente ligou/escreveu)'],
  ['saida', 'Feita (time ligou/escreveu)'],
]
const RESULTADOS: [string, string][] = [
  ['sem_resposta', 'Sem resposta'],
  ['resposta', 'Respondeu'],
  ['reuniao_agendada', 'Reunião agendada'],
  ['proposta_solicitada', 'Pediu proposta'],
  ['negativo', 'Negativo'],
]

const label = (opts: [string, string][], v: string) => opts.find(([k]) => k === v)?.[1] || v

export default function WhatsAppNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [itens, setItens] = useState<Interacao[]>([])
  const [error, setError] = useState('')
  const [direcao, setDirecao] = useState('saida')
  const [resultado, setResultado] = useState('resposta')
  const [resumo, setResumo] = useState('')
  const [proximaDescricao, setProximaDescricao] = useState('')
  const [proximaEm, setProximaEm] = useState('')
  const [salvando, setSalvando] = useState(false)

  const load = async () => {
    try {
      const resp = await pb.send<{ total: number; interacoes: Interacao[] }>(
        `/backend/v1/whatsapp/interacoes?negocio=${negocio.id}`,
      )
      setItens(resp.interacoes || [])
    } catch {
      setError('Não foi possível carregar as interações WhatsApp desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const registrar = async () => {
    setError('')
    setSalvando(true)
    try {
      const resp = await pb.send<{ proxima_acao_atualizada: boolean }>(
        '/backend/v1/whatsapp/interacoes',
        {
          method: 'POST',
          body: {
            negocio: negocio.id,
            direcao,
            resultado,
            resumo,
            proxima_acao_descricao: proximaDescricao,
            proxima_acao_em: proximaEm,
          },
        },
      )
      toast({
        title: 'Interação registrada',
        description: resp.proxima_acao_atualizada
          ? 'Próxima ação da oportunidade atualizada.'
          : undefined,
      })
      setResumo('')
      setProximaDescricao('')
      setProximaEm('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível registrar a interação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">WhatsApp</h2>
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
          <p className="text-sm font-semibold mb-3">Registrar interação</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Direção</label>
              <select
                value={direcao}
                onChange={(e) => setDirecao(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                {DIRECOES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Resultado</label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                {RESULTADOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="text-xs text-[#6B7280] block mb-1">Resumo da conversa *</label>
          <textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="O que foi falado, o que importa para a venda..."
            className="border rounded-lg px-3 py-2 text-sm w-full mb-3"
          />
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Próxima ação (opcional)</label>
              <input
                value={proximaDescricao}
                onChange={(e) => setProximaDescricao(e.target.value)}
                maxLength={1000}
                placeholder="Ex.: Enviar proposta revisada"
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Data da próxima ação</label>
              <input
                type="date"
                value={proximaEm}
                onChange={(e) => setProximaEm(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={salvando || resumo.trim().length < 5}
            onClick={() => void registrar()}
            className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {salvando ? 'Registrando...' : 'Registrar interação'}
          </button>
          <p className="text-xs text-[#6B7280] mt-2">
            Com próxima ação futura informada, a oportunidade é atualizada automaticamente.
          </p>
        </div>
        {itens.length === 0 ? (
          <p className="text-[#6B7280] text-sm">Nenhuma interação WhatsApp registrada.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Interações ({itens.length})</p>
            {itens.map((it) => (
              <div key={it.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5 font-semibold">
                    {it.direcao === 'entrada' ? '↑ Recebida' : '↓ Feita'}
                  </span>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                    {label(RESULTADOS, it.resultado)}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    {it.created
                      ? new Date(it.created.replace(' ', 'T')).toLocaleString('pt-BR')
                      : '—'}
                    {it.responsavel ? ` · ${it.responsavel}` : ''}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{it.resumo}</p>
                {it.proxima_acao_descricao && (
                  <p className="text-xs text-[#6B7280] mt-2">
                    Próxima ação: {it.proxima_acao_descricao}
                    {it.proxima_acao_em
                      ? ` · ${new Date(it.proxima_acao_em.replace(' ', 'T')).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
