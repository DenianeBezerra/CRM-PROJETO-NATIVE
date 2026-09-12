import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Formulario = {
  id: string
  token: string
  solucao: string
  status: string
  resumo?: string
  respondido_em?: string
  enviado_em?: string
  created?: string
}
type Oportunidade = { id: string; titulo: string; servico?: string }

const SOLUCOES: [string, string][] = [
  ['bpo_financeiro', 'BPO Financeiro'],
  ['cfo_as_a_service', 'CFO as a Service'],
  ['consultoria', 'Consultoria'],
]
const SERVICO_PARA_SOLUCAO: Record<string, string> = {
  bpo_financeiro: 'bpo_financeiro',
  tesouraria: 'bpo_financeiro',
  controladoria: 'bpo_financeiro',
  cfo_as_a_service: 'cfo_as_a_service',
}

export default function FormularioNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [itens, setItens] = useState<Formulario[]>([])
  const [solucao, setSolucao] = useState(
    SERVICO_PARA_SOLUCAO[negocio.servico || ''] || 'bpo_financeiro',
  )
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState('')

  const load = async () => {
    try {
      const regs = await pb.collection('formularios').getFullList<Formulario>({
        filter: `negocio = '${negocio.id}'`,
        sort: '-created',
      })
      setItens(regs)
    } catch {
      setError('Não foi possível carregar os formulários desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const linkDe = (token: string) => `${window.location.origin}/formulario/${token}`

  const gerar = async () => {
    setError('')
    try {
      const resp = await pb.send<{ token: string }>('/backend/v1/formularios/gerar', {
        method: 'POST',
        body: { negocio: negocio.id, solucao },
      })
      toast({ title: 'Formulário gerado', description: 'Copie o link e envie ao cliente.' })
      await navigator.clipboard?.writeText(linkDe(resp.token)).catch(() => {})
      setCopiado(resp.token)
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível gerar o formulário.')
    }
  }

  const marcarEnviado = async (f: Formulario) => {
    setError('')
    try {
      await pb.send(`/backend/v1/formularios/enviar/${f.id}`, { method: 'POST' })
      toast({ title: 'Formulário marcado como enviado' })
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível registrar o envio.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Formulário</h2>
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
          <p className="text-sm font-semibold mb-2">Gerar novo formulário</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1"
            >
              {SOLUCOES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void gerar()}
              className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Gerar link
            </button>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">
            O cliente responde sem login, pelo celular. As respostas voltam para cá e preparam a
            proposta.
          </p>
        </div>
        {itens.length === 0 ? (
          <p className="text-[#6B7280] text-sm">Nenhum formulário gerado para esta oportunidade.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Formulários ({itens.length})</p>
            {itens.map((f) => (
              <div key={f.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                    {SOLUCOES.find(([v]) => v === f.solucao)?.[1] || f.solucao}
                  </span>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">{f.status}</span>
                  {f.respondido_em && (
                    <span className="text-xs text-[#6B7280]">
                      Respondido em{' '}
                      {new Date(f.respondido_em.replace(' ', 'T')).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={linkDe(f.token)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 border rounded-lg px-2 py-1 text-xs bg-[#F7F5F1]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(linkDe(f.token)).catch(() => {})
                      setCopiado(f.token)
                      toast({ title: 'Link copiado' })
                    }}
                    className="text-xs border rounded px-2 py-1 font-semibold"
                  >
                    {copiado === f.token ? 'Copiado' : 'Copiar'}
                  </button>
                  {f.status === 'gerado' && (
                    <button
                      type="button"
                      onClick={() => void marcarEnviado(f)}
                      className="text-xs border rounded px-2 py-1 font-semibold"
                    >
                      Marcar enviado
                    </button>
                  )}
                </div>
                {f.resumo && (
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-[#F7F5F1] rounded-lg p-3 border">
                    {f.resumo}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
