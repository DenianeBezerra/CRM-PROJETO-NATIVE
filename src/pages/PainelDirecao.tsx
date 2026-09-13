import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  Crown,
  TrendingUp,
  Wallet,
  Users,
  Settings2,
  Target,
  Plus,
  Briefcase,
  Award,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
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
    // T3.20 (C-04/B-03): zero segundo é valor impossível para p50 — sem intervalo mensurável
    if (v <= 0) return '—'
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
  type NegocioData = {
    id: string
    titulo?: string
    valor?: number
    estagio?: string
    status?: string
    arquivado?: boolean
    cliente?: string
    expand?: { cliente?: { id?: string; nome?: string } }
  }
  type ClienteData = {
    id: string
    nome?: string
    origem?: string
    status?: string
  }
  type InteracaoData = {
    id: string
    tipo: string
    resumo: string
    data: string
    resultado?: string
    negocio?: string
  }

  const [rawNegocios, setRawNegocios] = useState<NegocioData[]>([])
  const [rawClientes, setRawClientes] = useState<ClienteData[]>([])
  const [rawInteracoes, setRawInteracoes] = useState<InteracaoData[]>([])
  const [_loadingLive, setLoadingLive] = useState(false)
  const [metas, setMetas] = useState<MetaItem[]>([])
  const [novaMeta, setNovaMeta] = useState({ chave: '', valor: '', periodicidade: 'mensal' })
  const [editValores, setEditValores] = useState<Record<string, string>>({})

  const load = async (p: string) => {
    setLoading(true)
    setError('')
    setLoadingLive(true)
    try {
      const [panelRes, negsRes, clientsRes, waRes, emailRes, stdInterRes] =
        await Promise.allSettled([
          pb.send<Painel>(`/backend/v1/painel/${p}`, {}),
          pb.collection('negocios').getFullList({ sort: '-created', expand: 'cliente' }),
          pb.collection('clientes').getFullList({ sort: '-created' }),
          pb
            .collection('interacoes_whatsapp')
            .getFullList({ sort: '-created', expand: 'negocio,contato' }),
          pb
            .collection('interacoes_email')
            .getFullList({ sort: '-created', expand: 'negocio,contato' }),
          pb
            .collection('interacoes')
            .getFullList({ sort: '-created' })
            .catch(() => []),
        ])

      if (panelRes.status === 'fulfilled') {
        setData(panelRes.value)
      } else {
        setError('Não foi possível carregar o painel consolidado. Exibindo dados locais.')
      }

      if (negsRes.status === 'fulfilled') {
        setRawNegocios(negsRes.value as unknown as NegocioData[])
      }
      if (clientsRes.status === 'fulfilled') {
        setRawClientes(clientsRes.value as unknown as ClienteData[])
      }

      // Consolida interações de todas as coleções do PB
      const interacoesConsolidadas: InteracaoData[] = []
      if (waRes.status === 'fulfilled' && Array.isArray(waRes.value)) {
        for (const item of waRes.value as Array<Record<string, unknown>>) {
          const expand = item.expand as Record<string, { titulo?: string }> | undefined
          interacoesConsolidadas.push({
            id: String(item.id),
            tipo: 'whatsapp',
            resumo: String(item.resumo || 'Conversa WhatsApp'),
            data: String(item.created || ''),
            resultado: item.resultado ? String(item.resultado) : undefined,
            negocio: expand?.negocio?.titulo || (item.negocio ? String(item.negocio) : undefined),
          })
        }
      }
      if (emailRes.status === 'fulfilled' && Array.isArray(emailRes.value)) {
        for (const item of emailRes.value as Array<Record<string, unknown>>) {
          const expand = item.expand as Record<string, { titulo?: string }> | undefined
          interacoesConsolidadas.push({
            id: String(item.id),
            tipo: 'email',
            resumo: String(item.assunto || item.resumo || 'E-mail enviado'),
            data: String(item.created || ''),
            resultado: item.resultado ? String(item.resultado) : undefined,
            negocio: expand?.negocio?.titulo || (item.negocio ? String(item.negocio) : undefined),
          })
        }
      }
      if (stdInterRes.status === 'fulfilled' && Array.isArray(stdInterRes.value)) {
        for (const item of stdInterRes.value as Array<Record<string, unknown>>) {
          interacoesConsolidadas.push({
            id: String(item.id),
            tipo: String(item.tipo || 'outro'),
            resumo: String(item.resumo || 'Interação registrada'),
            data: String(item.data || item.created || ''),
            negocio: item.negocio ? String(item.negocio) : undefined,
          })
        }
      }

      interacoesConsolidadas.sort((a, b) => {
        const da = new Date(a.data).getTime()
        const db = new Date(b.data).getTime()
        return db - da
      })

      setRawInteracoes(interacoesConsolidadas)
    } catch {
      setError('Não foi possível carregar o painel. Tente novamente.')
    } finally {
      setLoading(false)
      setLoadingLive(false)
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

  // Cálculos dinâmicos em tempo real com base nos dados do PocketBase
  const analytics = useMemo(() => {
    // 1. Pipeline em aberto (negócios não arquivados e não finalizados)
    const pipelineAberto = rawNegocios.filter(
      (n) => !n.arquivado && n.estagio !== 'fechado_ganho' && n.estagio !== 'fechado_perdido',
    )
    const pipelineAbertoValorTotal = pipelineAberto.reduce(
      (acc, n) => acc + (Number(n.valor) || 0),
      0,
    )

    // Agrupamento por estágio
    const pipelinePorEstagio: Record<string, { count: number; valor: number }> = {}
    for (const n of pipelineAberto) {
      const st = n.estagio || 'novo'
      if (!pipelinePorEstagio[st]) {
        pipelinePorEstagio[st] = { count: 0, valor: 0 }
      }
      pipelinePorEstagio[st].count += 1
      pipelinePorEstagio[st].valor += Number(n.valor) || 0
    }

    // 2. Negócios ganhos e perdidos
    const negociosGanhos = rawNegocios.filter(
      (n) => n.status === 'ganho' || n.estagio === 'fechado_ganho',
    )
    const negociosPerdidos = rawNegocios.filter(
      (n) => n.status === 'perdido' || n.estagio === 'fechado_perdido',
    )

    const totalEncerrados = negociosGanhos.length + negociosPerdidos.length
    const taxaConversao = totalEncerrados > 0 ? (negociosGanhos.length / totalEncerrados) * 100 : 0

    // 3. Receita fechada
    const receitaFechadaTotal = negociosGanhos.reduce((acc, n) => acc + (Number(n.valor) || 0), 0)
    const ticketMedio = negociosGanhos.length > 0 ? receitaFechadaTotal / negociosGanhos.length : 0

    // 4. Valores em negociação (especificamente em estágio de proposta)
    const emProposta = rawNegocios.filter((n) => n.estagio === 'proposta' && !n.arquivado)
    const valorEmProposta = emProposta.reduce((acc, n) => acc + (Number(n.valor) || 0), 0)

    // 5. Top clientes por valor de negócio
    const clienteValorMap: Record<
      string,
      { nome: string; valorTotal: number; qtdNegocios: number }
    > = {}
    for (const n of rawNegocios) {
      const cid = n.cliente || n.expand?.cliente?.id || 'indefinido'
      const nomeCliente = n.expand?.cliente?.nome || 'Cliente sem nome'
      if (!clienteValorMap[cid]) {
        clienteValorMap[cid] = { nome: nomeCliente, valorTotal: 0, qtdNegocios: 0 }
      }
      clienteValorMap[cid].valorTotal += Number(n.valor) || 0
      clienteValorMap[cid].qtdNegocios += 1
    }
    const topClientes = Object.values(clienteValorMap)
      .filter((c) => c.valorTotal > 0 || c.qtdNegocios > 0)
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5)

    // 6. Distribuição por origem dos clientes
    const distribuicaoOrigemClientes: Record<string, number> = {}
    for (const c of rawClientes) {
      const orig = c.origem || 'Outro'
      distribuicaoOrigemClientes[orig] = (distribuicaoOrigemClientes[orig] || 0) + 1
    }

    // 7. Interações por tipo
    const interacoesPorTipo: Record<string, number> = {}
    for (const it of rawInteracoes) {
      const t = it.tipo || 'outro'
      interacoesPorTipo[t] = (interacoesPorTipo[t] || 0) + 1
    }

    return {
      pipelineAberto,
      pipelineAbertoValorTotal,
      pipelinePorEstagio,
      negociosGanhos,
      negociosPerdidos,
      taxaConversao,
      receitaFechadaTotal,
      ticketMedio,
      emProposta,
      valorEmProposta,
      topClientes,
      distribuicaoOrigemClientes,
      interacoesPorTipo,
    }
  }, [rawNegocios, rawClientes, rawInteracoes])

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
                            ? Object.keys(k.valor || {}).length > 0
                              ? Object.keys(k.valor || {}).length + ' itens'
                              : '—'
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

            {/* SEÇÃO DINÂMICA: VISÃO COMERCIAL */}
            {papel === 'comercial' && (
              <section className="space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="font-playfair text-xl font-bold">Detalhamento Comercial</h2>
                      <p className="text-xs text-[#6B7280]">
                        Pipeline ativo, conversão, ticket médio e principais contas
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#FFFDF0] text-[#854D0E] border border-[#C9A227]/40 px-2.5 py-1 rounded-full font-medium">
                    {rawNegocios.length} negócios monitorados
                  </span>
                </div>

                {/* Cards KPIs Comerciais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Pipeline em Aberto
                      </p>
                      <Layers className="w-4 h-4 text-[#A8862B]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {analytics.pipelineAbertoValorTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      {analytics.pipelineAberto.length} oportunidade(s) em andamento
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Ganhos vs. Perdidos
                      </p>
                      <Award className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-playfair text-2xl font-bold text-green-700">
                        {analytics.negociosGanhos.length}
                      </span>
                      <span className="text-xs text-[#6B7280]">ganhos</span>
                      <span className="text-xs text-neutral-300">/</span>
                      <span className="font-playfair text-xl font-bold text-red-600">
                        {analytics.negociosPerdidos.length}
                      </span>
                      <span className="text-xs text-[#6B7280]">perdidos</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Taxa de conversão:{' '}
                      <strong className="text-[#0A0A0A]">
                        {analytics.taxaConversao.toFixed(1)}%
                      </strong>
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Ticket Médio
                      </p>
                      <DollarSign className="w-4 h-4 text-[#A8862B]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {analytics.ticketMedio.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Baseado nos {analytics.negociosGanhos.length} fechamentos
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Em Proposta
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-[#C9A227]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {analytics.valorEmProposta.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      {analytics.emProposta.length} proposta(s) formalizada(s)
                    </p>
                  </div>
                </div>

                {/* Duas colunas: Pipeline por Estágio + Top Clientes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pipeline por Estágio */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
                    <h3 className="font-playfair text-base font-bold mb-3 text-[#0A0A0A] flex items-center justify-between">
                      <span>Pipeline em Aberto por Estágio</span>
                      <span className="text-xs font-normal text-[#6B7280]">Quantidade & Valor</span>
                    </h3>
                    <div className="space-y-3">
                      {Object.keys(analytics.pipelinePorEstagio).length === 0 ? (
                        <p className="text-xs text-[#6B7280] py-4 text-center">
                          Nenhum negócio em aberto no momento.
                        </p>
                      ) : (
                        Object.entries(analytics.pipelinePorEstagio).map(([estagio, info]) => {
                          const estagioNome =
                            estagio === 'novo'
                              ? 'Novo'
                              : estagio === 'contato_feito'
                                ? 'Contato Feito'
                                : estagio === 'proposta'
                                  ? 'Proposta'
                                  : estagio === 'preparacao_contrato'
                                    ? 'Preparação de Contrato'
                                    : estagio
                          const pct =
                            analytics.pipelineAbertoValorTotal > 0
                              ? (info.valor / analytics.pipelineAbertoValorTotal) * 100
                              : 0
                          return (
                            <div key={estagio} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#0A0A0A]">{estagioNome}</span>
                                <span className="text-[#6B7280]">
                                  {info.count} negócio(s) ·{' '}
                                  <strong className="text-[#0A0A0A]">
                                    {info.valor.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                      maximumFractionDigits: 0,
                                    })}
                                  </strong>
                                </span>
                              </div>
                              <div className="h-2 bg-[#F7F5F1] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Top Clientes por Valor */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
                    <h3 className="font-playfair text-base font-bold mb-3 text-[#0A0A0A] flex items-center justify-between">
                      <span>Top Clientes por Valor</span>
                      <span className="text-xs font-normal text-[#6B7280]">
                        Ranking consolidado
                      </span>
                    </h3>
                    <div className="divide-y divide-[#F0EDE6]">
                      {analytics.topClientes.length === 0 ? (
                        <p className="text-xs text-[#6B7280] py-4 text-center">
                          Nenhum cliente com negócios associados.
                        </p>
                      ) : (
                        analytics.topClientes.map((cli, idx) => (
                          <div
                            key={idx}
                            className="py-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#0A0A0A] text-[#E8C766] flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-[#0A0A0A]">{cli.nome}</p>
                                <p className="text-[10px] text-[#6B7280]">
                                  {cli.qtdNegocios} negócio(s) registrado(s)
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-[#0A0A0A]">
                              {cli.valorTotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SEÇÃO DINÂMICA: VISÃO CONTROLADORIA */}
            {papel === 'controladoria' && (
              <section className="space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="font-playfair text-xl font-bold">
                        Controladoria & Indicadores Estruturais
                      </h2>
                      <p className="text-xs text-[#6B7280]">
                        Receita fechada, negociações ativas, origens de clientes e evolução de
                        interações
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#FFFDF0] text-[#854D0E] border border-[#C9A227]/40 px-2.5 py-1 rounded-full font-medium">
                    {rawClientes.length} clientes na carteira
                  </span>
                </div>

                {/* Cards KPIs Controladoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Receita Fechada (Ganho)
                      </p>
                      <Sparkles className="w-4 h-4 text-[#C9A227]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {analytics.receitaFechadaTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Soma acumulada de negócios ganhos
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Em Negociação (Propostas)
                      </p>
                      <DollarSign className="w-4 h-4 text-[#A8862B]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {analytics.valorEmProposta.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      {analytics.emProposta.length} negociação(ões) aguardando fechamento
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Total de Clientes
                      </p>
                      <Users className="w-4 h-4 text-[#A8862B]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {rawClientes.length}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Ativos e prospects cadastrados
                    </p>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#A8862B] uppercase tracking-wide">
                        Atividade Recente
                      </p>
                      <Activity className="w-4 h-4 text-[#A8862B]" />
                    </div>
                    <p className="font-playfair text-2xl font-bold mt-1 text-[#0A0A0A]">
                      {rawInteracoes.length}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-1">Interações registradas no CRM</p>
                  </div>
                </div>

                {/* Duas colunas: Origem dos Clientes + Atividade Recente / Interações */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distribuição por Origem dos Clientes */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
                    <h3 className="font-playfair text-base font-bold mb-3 text-[#0A0A0A] flex items-center justify-between">
                      <span>Distribuição por Origem dos Clientes</span>
                      <span className="text-xs font-normal text-[#6B7280]">Total por canal</span>
                    </h3>
                    <div className="space-y-3">
                      {Object.keys(analytics.distribuicaoOrigemClientes).length === 0 ? (
                        <p className="text-xs text-[#6B7280] py-4 text-center">
                          Nenhuma origem catalogada.
                        </p>
                      ) : (
                        Object.entries(analytics.distribuicaoOrigemClientes).map(
                          ([origem, qtd]) => {
                            const total = rawClientes.length || 1
                            const pct = (qtd / total) * 100
                            const origemNome =
                              origem === 'indicacao'
                                ? 'Indicação'
                                : origem === 'site'
                                  ? 'Site Oficial'
                                  : origem === 'redes_sociais'
                                    ? 'Redes Sociais'
                                    : origem === 'evento'
                                      ? 'Eventos'
                                      : origem === 'outro'
                                        ? 'Outros'
                                        : origem
                            return (
                              <div key={origem} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[#0A0A0A]">{origemNome}</span>
                                  <span className="text-[#6B7280]">
                                    {qtd} cliente(s) ({pct.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="h-2 bg-[#F7F5F1] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                                  />
                                </div>
                              </div>
                            )
                          },
                        )
                      )}
                    </div>
                  </div>

                  {/* Interações e Atividade Recente */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
                    <h3 className="font-playfair text-base font-bold mb-3 text-[#0A0A0A] flex items-center justify-between">
                      <span>Evolução & Atividade Recente</span>
                      <span className="text-xs font-normal text-[#6B7280]">
                        Por tipo de contato
                      </span>
                    </h3>

                    {/* Contagem por tipo */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {Object.entries(analytics.interacoesPorTipo).map(([tipo, count]) => (
                        <div
                          key={tipo}
                          className="bg-[#F7F5F1] rounded-lg p-2 text-center border border-[#E5E7EB]"
                        >
                          <p className="text-[10px] uppercase font-semibold text-[#A8862B]">
                            {tipo === 'whatsapp' ? 'WhatsApp' : tipo === 'email' ? 'E-mail' : tipo}
                          </p>
                          <p className="text-base font-bold text-[#0A0A0A]">{count}</p>
                        </div>
                      ))}
                    </div>

                    {/* Lista das interações mais recentes */}
                    <div className="divide-y divide-[#F0EDE6] max-h-56 overflow-y-auto pr-1">
                      {rawInteracoes.length === 0 ? (
                        <p className="text-xs text-[#6B7280] py-4 text-center">
                          Nenhuma interação recente registrada.
                        </p>
                      ) : (
                        rawInteracoes.slice(0, 5).map((it) => (
                          <div
                            key={it.id}
                            className="py-2 flex items-start justify-between text-xs gap-3"
                          >
                            <div>
                              <p className="font-semibold text-[#0A0A0A] line-clamp-1">
                                {it.resumo}
                              </p>
                              <p className="text-[10px] text-[#6B7280]">
                                {it.negocio ? `Negócio: ${it.negocio} · ` : ''}
                                {it.tipo.toUpperCase()}
                              </p>
                            </div>
                            <span className="text-[10px] text-[#6B7280] whitespace-nowrap">
                              {new Date(it.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
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
