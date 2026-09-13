import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Clock,
  FileWarning,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

// T3.15 — SPEC-3-015: Visão de coordenação (cap. 6.2 do doc da CEO).
// Fonte única: GET /backend/v1/visao/coordenacao (admin-only, somente leitura).
// Visual harmonizado T3.09 (ícone preto + glifo dourado, título bold, descrição cinza).

type MatrizItem = {
  empresa: string
  empresa_id: string
  status_operacional: string
  contagem: Record<string, number>
  pendentes: number
  proxima_obrigacao: { tipo: string; prazo: string } | null
}
type ExcecaoItem = {
  tipo: string
  empresa: string
  descricao: string
  aberta_em: string
  dias_aberta: number | null
  escalada_coordenacao: boolean
  reincidencia: number
}
type CargaItem = {
  analista: string
  obrigacoes_pendentes: number
  clientes_atendidos: number
}
type ExcecaoAnalista = { analista: string; abertas: number; mais_antiga_dias: number }
type VolumeItem = { empresa: string; executado_ciclo: number; referencia: number }
type FichaItem = { empresa: string; updated_em: string; dias_desatualizada: number }
type Resp = {
  gerado_em: string
  config_ficha_desatualizada_dias: number
  matriz: MatrizItem[]
  excecoes_abertas: ExcecaoItem[]
  excecoes_por_analista: ExcecaoAnalista[]
  carga_por_analista: CargaItem[]
  volumes_acima_referencia: VolumeItem[]
  fichas_desatualizadas: FichaItem[]
}

const statusLabel: Record<string, string> = {
  prevista: 'Previstas',
  em_execucao: 'Em execução',
  atrasada: 'Atrasadas',
  bloqueada: 'Bloqueadas',
  concluida: 'Concluídas',
  nao_aplicavel: 'N/A',
}
const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}

export default function VisaoCoordenacao() {
  const navigate = useNavigate()
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await pb.send<Resp>('/backend/v1/visao/coordenacao', {})
      setData(r)
    } catch {
      setError('Não foi possível carregar a visão de coordenação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalExcecoes = data?.excecoes_abertas.length ?? 0
  const alertas =
    (data?.volumes_acima_referencia.length ?? 0) + (data?.fichas_desatualizadas.length ?? 0)

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-[#E8C766] font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
        <h1 className="font-playfair text-lg font-bold text-white">Visão de coordenação</h1>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-[#E8C766]"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8">
        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        )}
        {!loading && error && <p className="text-sm text-red-700">{error}</p>}
        {!loading && data && (
          <div className="space-y-8">
            {/* Alertas de gestão */}
            {alertas > 0 && (
              <section className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-5">
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="font-playfair font-bold text-base mb-2">
                  Alertas de gestão ({alertas})
                </h2>
                {(data?.fichas_desatualizadas.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {data!.fichas_desatualizadas.map((f) => (
                      <div
                        key={f.empresa}
                        className="bg-white border border-amber-200 rounded-lg p-3 text-sm"
                      >
                        <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 mr-2">
                          Ficha desatualizada
                        </span>
                        <span className="font-semibold">{f.empresa}</span>
                        <span className="text-[#6B7280]">
                          {' '}
                          · sem revisão desde {dataBR(f.updated_em)} ({f.dias_desatualizada} dias
                          &gt; {data!.config_ficha_desatualizada_dias})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {(data?.volumes_acima_referencia.length ?? 0) > 0 && (
                  <div className="space-y-2 mt-2">
                    {data!.volumes_acima_referencia.map((v) => (
                      <div
                        key={v.empresa}
                        className="bg-white border border-amber-200 rounded-lg p-3 text-sm"
                      >
                        <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 mr-2">
                          Volume acima da referência
                        </span>
                        <span className="font-semibold">{v.empresa}</span>
                        <span className="text-[#6B7280]">
                          {' '}
                          · executado {v.executado_ciclo} vs. referência {v.referencia}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Exceções abertas */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                  <FileWarning className="w-4.5 h-4.5" />
                </div>
                <h2 className="font-playfair font-bold text-base">
                  Exceções abertas ({totalExcecoes})
                </h2>
              </div>
              {totalExcecoes === 0 ? (
                <p className="text-sm text-[#6B7280]">Nenhuma exceção aberta. Operação limpa.</p>
              ) : (
                <div className="space-y-2">
                  {data!.excecoes_abertas.map((e, i) => (
                    <div
                      key={i}
                      className="bg-white border border-[#E5E7EB] rounded-lg p-3 text-sm"
                    >
                      <span className="text-[10px] rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 mr-2">
                        {e.tipo}
                      </span>
                      <span className="font-semibold">{e.empresa}</span>
                      {e.dias_aberta !== null && (
                        <span className="text-[#6B7280]"> · {e.dias_aberta} dia(s) em aberto</span>
                      )}
                      {e.escalada_coordenacao && (
                        <span className="text-[10px] rounded-full bg-red-600 text-white px-2 py-0.5 font-semibold ml-2">
                          Escalada
                        </span>
                      )}
                      <p className="text-xs text-[#6B7280] mt-1">{e.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Matriz clientes × obrigações */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <h2 className="font-playfair font-bold text-base">
                  Matriz de clientes por obrigação
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full bg-white border border-[#E5E7EB] rounded-xl text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#6B7280]">
                      <th className="p-3 font-semibold">Cliente</th>
                      {Object.values(statusLabel).map((lbl) => (
                        <th key={lbl} className="p-3 font-semibold text-center">
                          {lbl}
                        </th>
                      ))}
                      <th className="p-3 font-semibold">Próxima vencendo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.matriz.map((m) => (
                      <tr key={m.empresa_id} className="border-b border-[#F3F4F6] last:border-0">
                        <td className="p-3">
                          <span className="font-semibold">{m.empresa}</span>
                          {m.status_operacional !== 'ativo' && (
                            <span className="text-[10px] rounded-full bg-gray-100 px-2 py-0.5 ml-2 text-[#6B7280]">
                              {m.status_operacional}
                            </span>
                          )}
                        </td>
                        {Object.keys(statusLabel).map((k) => (
                          <td
                            key={k}
                            className={
                              'p-3 text-center ' +
                              (k === 'atrasada' && m.contagem[k] > 0
                                ? 'text-red-700 font-bold'
                                : 'text-[#374151]')
                            }
                          >
                            {m.contagem[k] ?? 0}
                          </td>
                        ))}
                        <td className="p-3 text-xs text-[#6B7280]">
                          {m.proxima_obrigacao
                            ? `${m.proxima_obrigacao.tipo} · ${dataBR(m.proxima_obrigacao.prazo)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Carga por analista */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <h2 className="font-playfair font-bold text-base">Carga por analista</h2>
              </div>
              {data!.carga_por_analista.length === 0 && data!.excecoes_por_analista.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Nenhuma obrigação pendente atribuída.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data!.carga_por_analista.map((c) => (
                    <div
                      key={c.analista_id}
                      className="bg-white border border-[#E5E7EB] rounded-lg p-4"
                    >
                      <p className="font-semibold">{c.analista}</p>
                      <p className="text-xs text-[#6B7280] mt-1">
                        {c.obrigacoes_pendentes} obrigação(ões) pendente(s) · {c.clientes_atendidos}{' '}
                        cliente(s)
                      </p>
                    </div>
                  ))}
                  {data!.excecoes_por_analista.map((c) => (
                    <div
                      key={'exc-' + c.analista}
                      className="bg-white border border-[#E5E7EB] rounded-lg p-4"
                    >
                      <p className="font-semibold">{c.analista}</p>
                      <p className="text-xs text-[#6B7280] mt-1">
                        {c.abertas} exceção(ões) aberta(s) · mais antiga há {c.mais_antiga_dias}{' '}
                        dia(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-[11px] text-[#6B7280]">
              Gerado em {data!.gerado_em.slice(0, 16).replace('T', ' ')} UTC · somente leitura ·
              nenhuma escrita comercial nesta visão.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
