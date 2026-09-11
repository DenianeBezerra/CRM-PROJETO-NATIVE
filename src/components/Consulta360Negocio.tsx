import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

type Consulta360 = {
  titulo: string
  etapa: string
  diagnostico: {
    atual: { versao: number; resumo: string; motivo_atualizacao?: string } | null
    total_versoes: number
    historico: { versao: number; resumo: string; motivo_atualizacao?: string; criado_em?: string }[]
  }
  qualificacao: {
    percentual: number
    respondidas: number
    total_perguntas: number
    pendencias: { texto: string; obrigatoria: boolean }[]
  }
  responsavel: { id: string; nome: string }
  proxima_acao: { em: string; descricao: string; futura: boolean }
  handoff?: {
    estado: 'nenhum' | 'pendente' | 'aceito' | 'devolvido'
    criado_em?: string
    decidido_em?: string
    motivo_devolucao?: string
    pendencias_abertas?: { item?: string; dono?: string; prazo?: string }[]
    tempo_ate_aceite_segundos?: number | null
    tempo_base?: string
  }
  campos_ausentes: string[]
}

const HANDOFF_ESTADO: Record<string, { label: string; classe: string }> = {
  nenhum: { label: 'Nenhum handoff', classe: 'bg-[#F7F5F1] text-[#6B7280] border' },
  pendente: {
    label: 'Aguardando aceite',
    classe: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  aceito: { label: 'Aceito', classe: 'bg-green-50 text-green-800 border border-green-200' },
  devolvido: {
    label: 'Devolvido ao emissor',
    classe: 'bg-red-50 text-red-800 border border-red-200',
  },
}

const formatarTempo = (segundos: number | null | undefined): string => {
  if (segundos == null) return 'Aguardando reenvio'
  if (segundos < 60) return `${segundos}s`
  if (segundos < 3600) return `${Math.floor(segundos / 60)}min`
  if (segundos < 86400)
    return `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60)}min`
  const dias = Math.floor(segundos / 86400)
  return `${dias}d ${Math.floor((segundos % 86400) / 3600)}h`
}

const LABEL_AUSENTE: Record<string, string> = {
  diagnostico: 'Diagnóstico não registrado',
  responsavel: 'Sem responsável',
  proxima_acao_futura: 'Sem próxima ação com data futura',
  qualificacao_completa: 'Qualificação incompleta',
}

export default function Consulta360Negocio({
  negocioId,
  onClose,
}: {
  negocioId: string
  onClose: () => void
}) {
  const [dados, setDados] = useState<Consulta360 | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await pb.send<Consulta360>(`/backend/v1/negocios/${negocioId}/consulta-360`)
        setDados(resp)
      } catch {
        setError('Não foi possível carregar a consulta 360º desta oportunidade.')
      }
    }
    void load()
  }, [negocioId])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Consulta 360º</h2>
            <p className="text-sm text-[#6B7280]">{dados?.titulo || '...'}</p>
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
        {!dados ? (
          <p className="text-[#6B7280] text-sm">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {dados.campos_ausentes.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm font-semibold text-[#B91C1C] mb-1">Campos ausentes</p>
                <ul className="list-disc list-inside text-sm text-[#B91C1C]">
                  {dados.campos_ausentes.map((c) => (
                    <li key={c}>{LABEL_AUSENTE[c] || c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F7F5F1] border">
                <p className="text-xs text-[#6B7280]">Responsável</p>
                <p className="text-sm font-semibold">{dados.responsavel.nome || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F5F1] border">
                <p className="text-xs text-[#6B7280]">Próxima ação</p>
                <p className="text-sm font-semibold">
                  {dados.proxima_acao.descricao || '—'}
                  {dados.proxima_acao.em
                    ? ` · ${new Date(dados.proxima_acao.em.replace(' ', 'T')).toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F5F1] border">
                <p className="text-xs text-[#6B7280]">Qualificação</p>
                <p className="text-sm font-semibold">
                  {dados.qualificacao.percentual}%
                  {dados.qualificacao.total_perguntas > 0
                    ? ` (${dados.qualificacao.respondidas}/${dados.qualificacao.total_perguntas})`
                    : ' (sem perguntas)'}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Handoff</p>
                <span
                  className={`text-xs rounded-full px-2 py-1 ${
                    HANDOFF_ESTADO[dados.handoff?.estado || 'nenhum']?.classe ||
                    HANDOFF_ESTADO.nenhum.classe
                  }`}
                >
                  {HANDOFF_ESTADO[dados.handoff?.estado || 'nenhum']?.label || 'Nenhum handoff'}
                </span>
              </div>
              {dados.handoff && dados.handoff.estado !== 'nenhum' && (
                <div className="space-y-1 text-sm">
                  <p className="text-[#6B7280] text-xs">
                    Criado em{' '}
                    {dados.handoff.criado_em
                      ? new Date(dados.handoff.criado_em.replace(' ', 'T')).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                  <p>
                    <span className="text-[#6B7280]">Tempo até aceite: </span>
                    <span className="font-medium">
                      {formatarTempo(dados.handoff.tempo_ate_aceite_segundos)}
                    </span>
                    {dados.handoff.tempo_base === 'decorrido' && (
                      <span className="text-xs text-[#6B7280]"> (em andamento)</span>
                    )}
                  </p>
                  {dados.handoff.estado === 'devolvido' && dados.handoff.motivo_devolucao && (
                    <p className="text-xs text-[#B91C1C]">
                      Motivo da devolução: {dados.handoff.motivo_devolucao}
                    </p>
                  )}
                  {dados.handoff.pendencias_abertas &&
                    dados.handoff.pendencias_abertas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-amber-800">
                          Pendências abertas ({dados.handoff.pendencias_abertas.length})
                        </p>
                        <ul className="list-disc list-inside text-xs text-[#6B7280]">
                          {dados.handoff.pendencias_abertas.map((p, i) => (
                            <li key={i}>
                              {p.item || 'Pendência'} — dono: {p.dono || '—'} · prazo:{' '}
                              {p.prazo
                                ? new Date(p.prazo.replace(' ', 'T')).toLocaleDateString('pt-BR')
                                : '—'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">
                Diagnóstico{' '}
                {dados.diagnostico.atual
                  ? `— versão atual: v${dados.diagnostico.atual.versao} (${dados.diagnostico.total_versoes} no histórico)`
                  : '— nenhum registrado'}
              </p>
              {dados.diagnostico.atual && (
                <div className="border rounded-xl p-4 mb-2 bg-[#F7F5F1]">
                  <p className="text-xs text-[#6B7280] mb-1">
                    v{dados.diagnostico.atual.versao} (atual)
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{dados.diagnostico.atual.resumo}</p>
                </div>
              )}
              {dados.diagnostico.historico.length > 1 && (
                <details className="border rounded-xl p-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    Histórico completo ({dados.diagnostico.total_versoes} versões)
                  </summary>
                  <div className="mt-3 space-y-2">
                    {dados.diagnostico.historico.map((h) => (
                      <div key={h.versao} className="border rounded-lg p-3">
                        <p className="text-xs text-[#6B7280]">v{h.versao}</p>
                        <p className="text-sm whitespace-pre-wrap">{h.resumo}</p>
                        {h.motivo_atualizacao && (
                          <p className="text-xs text-[#6B7280] mt-1">
                            Motivo: {h.motivo_atualizacao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
