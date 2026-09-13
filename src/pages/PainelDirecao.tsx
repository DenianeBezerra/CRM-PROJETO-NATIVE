import React, { useEffect, useState } from 'react'
import { ArrowLeft, Crown, TrendingUp, Wallet, Users, Settings2, Target, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

// T3.10 — SPEC-3-010: Painel de Direção (camada CEO).
// 12 KPIs em 4 grupos (Aquisição, Pipeline, Financeiro, Operação), cada um com
// valor, meta (quando configurada) com barra de progresso dourada e variação vs.
// período anterior. Cards no padrão harmonizado (ícone preto + glifo dourado).
// Somente leitura via /backend/v1/painel/direcao.

type Meta = {
  chave: string
  valor: number
  periodicidade: string
  pct: number | null
  atingida: boolean
  descricao: string
} | null
type DistItem = { qtd: number; valor?: number }
type Kpi = {
  kpi: string
  valor: number | Record<string, DistItem | number> | null
  valor_anterior: number | null
  variacao_pct: number | null
  meta: Meta
  unidade: string
}
type Grupo = { grupo: string; kpis: Kpi[] }
type Painel = {
  papel: string
  periodo: { inicio: string; fim: string }
  periodo_anterior: { inicio: string; fim: string }
  premissa_mrr: string
  grupos: Grupo[]
  fontes_com_erro: string[]
}

const GRUPO_ICONE: Record<string, React.ComponentType<{ className?: string }>> = {
  Aquisição: Users,
  Pipeline: TrendingUp,
  Financeiro: Wallet,
  Operação: Settings2,
  Comercial: TrendingUp,
  Controladoria: Wallet,
}

const KPI_LABEL: Record<string, string> = {
  novos_negocios: 'Novos negócios',
  leads_entrada: 'Leads de entrada',
  taxa_lead_negocio: 'Taxa lead → negócio',
  oportunidades_ativas: 'Oportunidades ativas',
  propostas_abertas: 'Propostas em aberto',
  valor_propostas_abertas: 'Valor em propostas',
  propostas_paradas: 'Propostas paradas (>10d)',
  conversao: 'Conversão (ganho/encerradas)',
  mrr: 'MRR contratado',
  receita_nova: 'Receita nova',
  ticket_medio: 'Ticket médio',
  tarefas_vencidas: 'Tarefas vencidas',
  oportunidades_paradas: 'Oportunidades paradas',
  primeira_resposta_p50_segundos: 'Primeira resposta (p50)',
  tempo_decisao_dias: 'Tempo de decisão (mediana)',
  negocios_por_etapa: 'Negócios por etapa',
  taxa_conversao_por_etapa: 'Conversão por etapa',
  ciclo_medio_venda_dias: 'Ciclo médio de venda',
  origem_ganhos: 'Origem dos ganhos',
  motivo_perda: 'Motivo de perda',
  negocios_parados: 'Negócios parados',
}

const KPI_DESC: Record<string, string> = {
  novos_negocios: 'Negócios criados no período.',
  leads_entrada: 'Envios pelo formulário de entrada.',
  taxa_lead_negocio: 'Negócios criados ÷ leads de entrada.',
  oportunidades_ativas: 'Não arquivadas e não encerradas.',
  propostas_abertas: 'Emitidas, sem decisão, em negócio ativo.',
  valor_propostas_abertas: 'Soma do valor das propostas abertas.',
  propostas_paradas: 'Emitidas há mais de 10 dias sem decisão.',
  conversao: 'Ganhos ÷ encerradas no período.',
  mrr: 'Mensalidade dos clientes ativos.',
  receita_nova: 'Valor dos ganhos do período.',
  ticket_medio: 'Receita nova ÷ ganhos.',
  tarefas_vencidas: 'Abertas com prazo no passado.',
  oportunidades_paradas: 'Acima do limite de dias na etapa.',
  primeira_resposta_p50_segundos: 'Mediana da 1ª mudança de etapa.',
  tempo_decisao_dias: 'Entrada → decisão (mediana).',
  negocios_por_etapa: 'Quantidade e valor por etapa ativa.',
  taxa_conversao_por_etapa: 'Avanço entre etapas no período.',
  ciclo_medio_venda_dias: 'Entrada → ganho (média do período).',
  origem_ganhos: 'Ganhos do período por canal.',
  motivo_perda: 'Perdas do período por motivo.',
  negocios_parados: 'Sem atividade registrada acima do limite.',
}

const fmt = (v: number | null, unidade: string) => {
  if (v == null) return '—'
  if (unidade === 'moeda')
    return v.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    })
  if (unidade === 'percentual') return `${(v * 100).toFixed(0)}%`
  if (unidade === 'segundos') {
    if (v < 3600) return `${Math.round(v / 60)} min`
    if (v < 86400) return `${Math.round(v / 3600)} h`
    return `${Math.round(v / 86400)} d`
  }
  if (unidade === 'dias') return `${v.toFixed(1)} d`
  if (unidade === 'distribuicao') return ''
  return v.toLocaleString('pt-BR')
}

const fmtDist = (valor: Record<string, DistItem | number> | null) => {
  if (!valor || typeof valor !== 'object') return null
  const entries = Object.entries(valor)
  if (entries.length === 0) return null
  return entries
    .sort((a, b) => {
      const qa = typeof a[1] === 'number' ? a[1] : (a[1] as DistItem).qtd
      const qb = typeof b[1] === 'number' ? b[1] : (b[1] as DistItem).qtd
      return qb - qa
    })
    .slice(0, 6)
}

type MetaItem = {
  id: string
  chave: string
  papel: string
  valor_meta: number
  periodicidade: string
  ativo: boolean
  descricao: string
}

export default function PainelDirecao() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [papel, setPapel] = useState(searchParams.get('papel') || 'direcao')
  const [data, setData] = useState<Painel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metas, setMetas] = useState<MetaItem[]>([])
  const [novaMeta, setNovaMeta] = useState({ chave: '', valor: '', periodicidade: 'mensal' })
  const [editValores, setEditValores] = useState<Record<string, string>>({})

  const load = async (p: string) => {
    setLoading(true)
    setError('')
    try {
      const r = await pb.send<Painel>(`/backend/v1/painel/${p}`, {})
      setData(r)
    } catch {
      setError('Não foi possível carregar o painel. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  const loadMetas = async () => {
    try {
      const r = await pb.send<{ total: number; itens: MetaItem[] }>('/backend/v1/metas', {})
      setMetas(r.itens || [])
    } catch {
      setMetas([])
    }
  }

  useEffect(() => {
    void load(papel)
    if (user?.role === 'admin') void loadMetas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papel])

  const trocarPapel = (p: string) => {
    setPapel(p)
    setSearchParams(p === 'direcao' ? {} : { papel: p })
  }

  const salvarMeta = async (m: MetaItem) => {
    const v = Number(editValores[m.id])
    if (!Number.isFinite(v) || v < 0) return
    try {
      await pb.send(`/backend/v1/metas/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ valor_meta: v }),
      })
      await loadMetas()
      await load(papel)
    } catch {
      setError('Falha ao salvar a meta.')
    }
  }
  const criarMeta = async () => {
    const v = Number(novaMeta.valor)
    if (!novaMeta.chave || !Number.isFinite(v) || v < 0) return
    try {
      await pb.send('/backend/v1/metas', {
        method: 'POST',
        body: JSON.stringify({
          chave: novaMeta.chave,
          papel,
          valor_meta: v,
          periodicidade: novaMeta.periodicidade,
        }),
      })
      setNovaMeta({ chave: '', valor: '', periodicidade: 'mensal' })
      await loadMetas()
      await load(papel)
    } catch {
      setError('Falha ao criar a meta (verifique se já não existe uma ativa).')
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#E8C766]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-xs rounded-full bg-[#141414] border border-[#C9A227]/40 px-3 py-1 text-[#E8C766] font-semibold">
          Camada CEO
        </span>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 mb-4">
            {(['direcao', 'comercial', 'controladoria'] as const).map((p) => (
              <button
                key={p}
                onClick={() => trocarPapel(p)}
                className={
                  'text-xs rounded-full px-3 py-1.5 border transition-all ' +
                  (papel === p
                    ? 'bg-[#0A0A0A] text-[#E8C766] border-[#C9A227] font-semibold'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#C9A227]/60')
                }
              >
                {p === 'direcao' ? 'Direção' : p === 'comercial' ? 'Comercial' : 'Controladoria'}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          {papel === 'direcao'
            ? 'Painel de Direção'
            : papel === 'comercial'
              ? 'Painel Comercial'
              : 'Painel Controladoria'}
        </p>
        <h1 className="font-playfair text-4xl font-bold">A saúde do negócio</h1>
        <p className="text-[#6B7280] mt-2 mb-2">
          {data
            ? `Período: ${new Date(data.periodo.inicio.replace(' ', 'T')).toLocaleDateString('pt-BR')} a ${new Date(data.periodo.fim.replace(' ', 'T')).toLocaleDateString('pt-BR')} · comparado com o período anterior de mesma duração.`
            : ''}
        </p>
        {data && (
          <p className="text-xs text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg p-3 mb-6">
            ℹ️ {data.premissa_mrr}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando indicadores...
          </div>
        )}
        {data && !loading && (
          <div className="space-y-8">
            {data.grupos.map((g) => {
              const Icone = GRUPO_ICONE[g.grupo] || Crown
              return (
                <section key={g.grupo}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                      <Icone className="w-4.5 h-4.5" />
                    </div>
                    <h2 className="font-playfair text-xl font-bold">{g.grupo}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {g.kpis.map((k) => (
                      <div
                        key={k.kpi}
                        className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 hover:shadow-md transition-all"
                      >
                        <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                          {KPI_LABEL[k.kpi] || k.kpi}
                        </p>
                        <p className="font-playfair text-2xl font-bold mt-1">
                          {k.unidade === 'distribuicao'
                            ? Object.keys(k.valor || {}).length + ' itens'
                            : fmt(k.valor as number | null, k.unidade)}
                        </p>
                        {k.unidade === 'distribuicao' &&
                          fmtDist(k.valor as Record<string, DistItem | number> | null)?.map(
                            ([chave, v]) => (
                              <p key={chave} className="text-[11px] text-[#374151]">
                                <span className="font-semibold">{chave}</span>
                                {' · '}
                                {typeof v === 'number'
                                  ? v
                                  : `${v.qtd}${v.valor ? ` (R$ ${Math.round(v.valor).toLocaleString('pt-BR')})` : ''}`}
                              </p>
                            ),
                          )}
                        <p className="text-[10px] text-[#6B7280] mt-0.5">{KPI_DESC[k.kpi] || ''}</p>
                        {/* Meta */}
                        {k.meta && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#6B7280]">
                                Meta: {fmt(k.meta.valor, k.unidade)} ({k.meta.periodicidade})
                              </span>
                              <span
                                className={
                                  k.meta.atingida
                                    ? 'text-green-700 font-bold'
                                    : 'text-[#A8862B] font-semibold'
                                }
                              >
                                {k.meta.pct != null ? `${Math.round(k.meta.pct)}%` : '—'}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#F7F5F1] rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full"
                                style={{
                                  width:
                                    k.meta.pct != null
                                      ? `${Math.min(100, Math.max(0, k.meta.pct))}%`
                                      : '0%',
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Variação */}
                        <p className="text-[10px] mt-2">
                          {k.variacao_pct == null ? (
                            <span className="text-[#6B7280]">
                              Sem base de comparação no período anterior
                            </span>
                          ) : k.variacao_pct >= 0 ? (
                            <span className="text-green-700 font-semibold">
                              ▲ +{k.variacao_pct.toFixed(0)}% vs. período anterior
                            </span>
                          ) : (
                            <span className="text-red-700 font-semibold">
                              ▼ {k.variacao_pct.toFixed(0)}% vs. período anterior
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
            {user?.role === 'admin' && (
              <section className="pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="font-playfair text-xl font-bold">Metas do painel</h2>
                </div>
                <div className="space-y-2">
                  {metas
                    .filter((m) => m.papel === papel)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex items-center gap-3 text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{m.chave}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {m.descricao || m.periodicidade}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          defaultValue={m.valor_meta}
                          onChange={(e) =>
                            setEditValores({ ...editValores, [m.id]: e.target.value })
                          }
                          className="w-24 border border-[#E5E7EB] rounded-lg px-2 py-1 text-right"
                        />
                        <button
                          onClick={() => void salvarMeta(m)}
                          className="text-xs font-semibold text-[#A8862B] hover:underline"
                        >
                          Salvar
                        </button>
                      </div>
                    ))}
                  <div className="bg-[#F7F5F1] border border-dashed border-[#C9A227]/50 rounded-lg p-3 flex flex-wrap items-center gap-2 text-sm">
                    <input
                      placeholder="chave do indicador (ex. mrr_minimo)"
                      value={novaMeta.chave}
                      onChange={(e) => setNovaMeta({ ...novaMeta, chave: e.target.value })}
                      className="border border-[#E5E7EB] rounded-lg px-2 py-1 flex-1 min-w-[180px]"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="valor"
                      value={novaMeta.valor}
                      onChange={(e) => setNovaMeta({ ...novaMeta, valor: e.target.value })}
                      className="w-24 border border-[#E5E7EB] rounded-lg px-2 py-1 text-right"
                    />
                    <select
                      value={novaMeta.periodicidade}
                      onChange={(e) => setNovaMeta({ ...novaMeta, periodicidade: e.target.value })}
                      className="border border-[#E5E7EB] rounded-lg px-2 py-1"
                    >
                      <option value="mensal">mensal</option>
                      <option value="semanal">semanal</option>
                      <option value="trimestral">trimestral</option>
                      <option value="anual">anual</option>
                    </select>
                    <button
                      onClick={() => void criarMeta()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#0A0A0A] border border-[#C9A227] rounded-lg px-3 py-1.5 hover:bg-[#141414]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova meta
                    </button>
                  </div>
                </div>
              </section>
            )}
            {data.fontes_com_erro.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
                Aviso: algumas fontes falharam ({data.fontes_com_erro.join(', ')}) — os números
                podem estar incompletos.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
