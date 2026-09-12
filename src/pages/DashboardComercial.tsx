import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

type Dashboard = {
  filtros: { periodo_inicio: string | null; periodo_fim: string | null; origem: string | null }
  leads_por_origem: {
    n: number
    n_total_sem_filtro_origem: number
    por_origem: Record<string, number>
  }
  leads_por_canal: { n: number; por_canal: Record<string, number> }
  ganhos_por_motivo: { n: number; por_motivo: Record<string, number> }
  oportunidades_por_etapa: { n: number; por_etapa: Record<string, number> }
  primeira_resposta: {
    n: number
    n_sem_transicao: number
    p50_segundos: number | null
    p90_segundos: number | null
  }
  tempo_por_etapa: { n: number; por_etapa_segundos: Record<string, number> }
  propostas_ciclo: {
    n: number
    por_status: Record<string, number>
    valor_total: number
    tempo_medio_decisao_segundos: number | null
    n_com_tempo_decisao: number
  }
  conversao: { n_encerradas: number; n_ganhas: number; taxa: number | null }
  perdas: { n: number; por_motivo: Record<string, number> }
  filas: {
    acoes_vencidas: { n: number; itens: { id: string; titulo: string }[] }
    oportunidades_paradas: {
      n: number
      itens: { id: string; titulo: string; dias_na_etapa: number }[]
      limite_dias: number
    }
  }
  cobertura: string[]
  cobertura_por_bloco: Record<
    string,
    { n_com_dado: number; n_sem_dado: number; aviso: string | null }
  >
}
const fmtDur = (s: number | null) => {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return `${Math.floor(s / 86400)} d`
}
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const ORIGEM_LABEL: Record<string, string> = {
  indicacao: 'Indicação',
  site: 'Site',
  redes_sociais: 'Redes sociais',
  evento: 'Evento',
  outro: 'Outro',
}

// T3.01 — atribuição granular e motivo de ganho
const CANAL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  site: 'Site',
  google: 'Google',
  pagina_captura: 'Página de captura',
  comunidade: 'Comunidade',
  evento: 'Evento',
  indicacao: 'Indicação',
  trafego_pago: 'Tráfego pago',
  parceiro: 'Parceiro',
  outro: 'Outro',
}
const MOTIVO_GANHO_LABEL: Record<string, string> = {
  preco: 'Preço',
  escopo: 'Escopo',
  relacionamento: 'Relacionamento',
  urgencia: 'Urgência',
  indicacao_interna: 'Indicação interna',
  outro: 'Outro',
}

const ETAPA_LABEL: Record<string, string> = {
  novo: 'Novo',
  contato_feito: 'Contato feito',
  proposta: 'Proposta',
  fechado_ganho: 'Fechado (ganho)',
  fechado_perdido: 'Fechado (perdido)',
}

const STATUS_PROPOSTA_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  emitida: 'Emitida',
  aceita: 'Aceita',
  recusada: 'Recusada',
}

function Bloco({
  titulo,
  cobertura,
  children,
}: {
  titulo: string
  cobertura?: { n_com_dado: number; n_sem_dado: number; aviso: string | null }
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-semibold">{titulo}</h2>
        {cobertura && cobertura.n_sem_dado > 0 && (
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5"
            title={cobertura.aviso || 'Cobertura incompleta'}
          >
            Cobertura {cobertura.n_com_dado}/{cobertura.n_com_dado + cobertura.n_sem_dado}
          </span>
        )}
      </div>
      {cobertura && cobertura.aviso && (
        <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {cobertura.aviso}
        </p>
      )}
      {children}
    </section>
  )
}

function Num({ label, value, n }: { label: string; value: string; n?: number | string }) {
  return (
    <div className="p-3 rounded-lg bg-[#F7F5F1] border">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="text-lg font-semibold">
        {value}
        {n !== undefined && <span className="text-xs font-normal text-[#6B7280]"> (N={n})</span>}
      </p>
    </div>
  )
}

export default function DashboardComercial() {
  const navigate = useNavigate()
  const [dados, setDados] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [origem, setOrigem] = useState('')
  const [drilldown, setDrilldown] = useState<{
    bloco: string
    chave: string | null
    n: number
    itens: Record<string, unknown>[]
  } | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const abrirDrilldown = async (bloco: string, chave?: string) => {
    setDrillLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('bloco', bloco)
      if (chave) params.set('chave', chave)
      if (inicio) params.set('periodo_inicio', inicio)
      if (fim) params.set('periodo_fim', fim)
      if (origem) params.set('origem', origem)
      const resp = await pb.send<{
        bloco: string
        chave: string | null
        n: number
        itens: Record<string, unknown>[]
      }>(`/backend/v1/dashboard/comercial/drilldown?${params.toString()}`)
      setDrilldown(resp)
    } catch {
      setDrilldown(null)
    } finally {
      setDrillLoading(false)
    }
  }

  const exportarCsv = async () => {
    setExportMsg('')
    try {
      const params = new URLSearchParams()
      if (inicio) params.set('periodo_inicio', inicio)
      if (fim) params.set('periodo_fim', fim)
      if (origem) params.set('origem', origem)
      const qs = params.toString()
      const resp = await pb.send<{ filename: string; quantidade: number; csv: string }>(
        `/backend/v1/dashboard/comercial/export${qs ? '?' + qs : ''}`,
      )
      const blob = new Blob(['\ufeff' + resp.csv.replace(/^\ufeff/, '')], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = resp.filename
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg(`Exportado: ${resp.quantidade} linhas.`)
    } catch {
      setExportMsg('Falha ao exportar. Nenhum arquivo gerado.')
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (inicio) params.set('periodo_inicio', inicio)
      if (fim) params.set('periodo_fim', fim)
      if (origem) params.set('origem', origem)
      const qs = params.toString()
      const resp = await pb.send<Dashboard>(`/backend/v1/dashboard/comercial${qs ? '?' + qs : ''}`)
      setDados(resp)
    } catch {
      setError('Não foi possível carregar o dashboard comercial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </header>
      <main className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Leitura de decisão
        </p>
        <h1 className="font-playfair text-4xl font-bold">Dashboard comercial</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Cada número com o seu N — denominador explícito, filtros consistentes.
        </p>

        <div className="bg-white border rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium">
            Início
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="mt-1 block border rounded px-2 py-1.5"
            />
          </label>
          <label className="text-xs font-medium">
            Fim
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="mt-1 block border rounded px-2 py-1.5"
            />
          </label>
          <label className="text-xs font-medium">
            Origem
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="mt-1 block border rounded px-2 py-1.5 bg-white"
            >
              <option value="">Todas</option>
              <option value="indicacao">Indicação</option>
              <option value="site">Site</option>
              <option value="redes_sociais">Redes sociais</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <button
            onClick={() => void load()}
            className="px-4 py-2 rounded-lg bg-[#0A0A0A] text-white text-sm font-medium"
          >
            Aplicar filtros
          </button>
          <button
            onClick={() => void exportarCsv()}
            className="px-4 py-2 rounded-lg border border-[#A8862B] text-[#A8862B] text-sm font-medium hover:bg-[#A8862B]/10"
            title="Exporta as agregações exibidas (mesmos filtros) em CSV"
          >
            Exportar CSV
          </button>
        </div>
        {exportMsg && <p className="mb-4 text-xs text-[#6B7280]">{exportMsg}</p>}

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Calculando dashboard...</p>
        ) : dados ? (
          <div className="space-y-5">
            {dados.cobertura.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-800 mb-1">Cobertura incompleta</p>
                <ul className="list-disc list-inside text-xs text-amber-800">
                  {dados.cobertura.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Num label="Leads (N)" value={String(dados.leads_por_origem.n)} />
              <Num
                label="Conversão"
                value={dados.conversao.taxa != null ? `${dados.conversao.taxa}%` : '—'}
                n={dados.conversao.n_encerradas}
              />
              <Num
                label="Primeira resposta (p50)"
                value={
                  dados.primeira_resposta.n === 0
                    ? 'Sem dados no período'
                    : fmtDur(dados.primeira_resposta.p50_segundos)
                }
                n={dados.primeira_resposta.n}
              />
              <Num
                label="Propostas no ciclo"
                value={String(dados.propostas_ciclo.n)}
                n={dados.propostas_ciclo.n}
              />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Bloco
                titulo={`Leads por origem (N=${dados.leads_por_origem.n})`}
                cobertura={dados.cobertura_por_bloco?.leads_por_origem}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.leads_por_origem.por_origem).map(([o, v]) => (
                    <li
                      key={o}
                      className="flex justify-between cursor-pointer hover:bg-[#F7F5F1] rounded px-1 -mx-1"
                      onClick={() => void abrirDrilldown('leads_por_origem', o)}
                      title="Ver as oportunidades que compõem este número"
                    >
                      <span className="capitalize">{ORIGEM_LABEL[o] || o.replace('_', ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {dados.leads_por_origem.n === 0 && (
                    <li className="text-[#6B7280] text-xs">Nenhum lead no filtro atual.</li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Leads por canal (N=${dados.leads_por_canal?.n ?? 0})`}
                cobertura={dados.cobertura_por_bloco?.leads_por_canal}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.leads_por_canal?.por_canal || {}).map(([c, v]) => (
                    <li
                      key={c}
                      className="flex justify-between cursor-pointer hover:bg-[#F7F5F1] rounded px-1 -mx-1"
                      onClick={() => void abrirDrilldown('leads_por_canal', c)}
                      title="Ver as oportunidades que compõem este número"
                    >
                      <span>{CANAL_LABEL[c] || c.replace('_', ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {!dados.leads_por_canal?.n && (
                    <li className="text-[#6B7280] text-xs">
                      Nenhum lead com canal no filtro atual.
                    </li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Ganhos por motivo (N=${dados.ganhos_por_motivo?.n ?? 0})`}
                cobertura={dados.cobertura_por_bloco?.ganhos_por_motivo}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.ganhos_por_motivo?.por_motivo || {}).map(([m, v]) => (
                    <li
                      key={m}
                      className="flex justify-between cursor-pointer hover:bg-[#F7F5F1] rounded px-1 -mx-1"
                      onClick={() => void abrirDrilldown('ganhos_por_motivo', m)}
                      title="Ver as oportunidades que compõem este número"
                    >
                      <span>{MOTIVO_GANHO_LABEL[m] || m.replace('_', ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {!dados.ganhos_por_motivo?.n && (
                    <li className="text-[#6B7280] text-xs">
                      Nenhum ganho com motivo no filtro atual.
                    </li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Oportunidades por etapa (N=${dados.oportunidades_por_etapa.n})`}
                cobertura={dados.cobertura_por_bloco?.oportunidades_por_etapa}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.oportunidades_por_etapa.por_etapa).map(([e, v]) => (
                    <li
                      key={e}
                      className="flex justify-between cursor-pointer hover:bg-[#F7F5F1] rounded px-1 -mx-1"
                      onClick={() => void abrirDrilldown('oportunidades_por_etapa', e)}
                      title="Ver as oportunidades que compõem este número"
                    >
                      <span className="capitalize">{ETAPA_LABEL[e] || e}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {dados.oportunidades_por_etapa.n === 0 && (
                    <li className="text-[#6B7280] text-xs">
                      Nenhuma oportunidade no filtro atual.
                    </li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Tempo por etapa (N=${dados.tempo_por_etapa.n})`}
                cobertura={dados.cobertura_por_bloco?.tempo_por_etapa}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.tempo_por_etapa.por_etapa_segundos).map(([e, s]) => (
                    <li key={e} className="flex justify-between">
                      <span className="capitalize">{ETAPA_LABEL[e] || e}</span>
                      <span className="font-semibold">{fmtDur(s)}</span>
                    </li>
                  ))}
                  {Object.keys(dados.tempo_por_etapa.por_etapa_segundos).length === 0 && (
                    <li className="text-[#6B7280] text-xs">Sem tempo apurado no filtro atual.</li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Propostas / ciclo (N=${dados.propostas_ciclo.n})`}
                cobertura={dados.cobertura_por_bloco?.propostas_ciclo}
              >
                <div className="text-sm space-y-1">
                  <p>
                    Valor total:{' '}
                    <span className="font-semibold">
                      {fmtBRL(dados.propostas_ciclo.valor_total)}
                    </span>
                  </p>
                  <p>
                    Tempo médio de decisão:{' '}
                    <span className="font-semibold">
                      {fmtDur(dados.propostas_ciclo.tempo_medio_decisao_segundos)}
                    </span>{' '}
                    <span className="text-xs text-[#6B7280]">
                      (N={dados.propostas_ciclo.n_com_tempo_decisao})
                    </span>
                  </p>
                  <ul className="pt-1">
                    {Object.entries(dados.propostas_ciclo.por_status).map(([s, v]) => (
                      <li key={s} className="flex justify-between text-xs">
                        <span className="capitalize">{STATUS_PROPOSTA_LABEL[s] || s}</span>
                        <span className="font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Bloco>
              <Bloco
                titulo={`Perdas (N=${dados.perdas.n})`}
                cobertura={dados.cobertura_por_bloco?.perdas}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.perdas.por_motivo).map(([m, v]) => (
                    <li
                      key={m}
                      className="flex justify-between cursor-pointer hover:bg-[#F7F5F1] rounded px-1 -mx-1"
                      onClick={() => void abrirDrilldown('perdas', m)}
                      title="Ver as oportunidades que compõem este número"
                    >
                      <span className="capitalize">{m.replace('_', ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {dados.perdas.n === 0 && (
                    <li className="text-[#6B7280] text-xs">Nenhuma perda no filtro atual.</li>
                  )}
                </ul>
              </Bloco>
              <Bloco titulo="Filas">
                <div className="text-sm space-y-2">
                  <p className="flex justify-between">
                    <span>Ações vencidas</span>
                    <span className="font-semibold">{dados.filas.acoes_vencidas.n}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>
                      Oportunidades paradas{' '}
                      <span className="text-xs text-[#6B7280]">
                        (limite {dados.filas.oportunidades_paradas.limite_dias}d)
                      </span>
                    </span>
                    <span className="font-semibold">{dados.filas.oportunidades_paradas.n}</span>
                  </p>
                </div>
              </Bloco>
            </div>

            <div className="pt-2 text-xs text-[#6B7280]">
              Clique em uma linha dos blocos Leads por origem, Oportunidades por etapa ou Perdas
              para ver as oportunidades que compõem o número (drill-down).
            </div>
          </div>
        ) : null}
      </main>

      {drilldown && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setDrilldown(null)}
        >
          <div
            className="bg-white rounded-xl border shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto p-5"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">
                  Drill-down — {drilldown.bloco}
                  {drilldown.chave ? ` · ${drilldown.chave}` : ''}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {drillLoading
                    ? 'Carregando...'
                    : `${drilldown.n} registro(s) — mesmo filtro do número exibido.`}
                </p>
              </div>
              <button
                onClick={() => setDrilldown(null)}
                className="text-sm text-[#6B7280] hover:text-[#0A0A0A]"
              >
                Fechar
              </button>
            </div>
            {drilldown.n === 0 ? (
              <p className="text-sm text-[#6B7280]">Nenhum registro compõe este número.</p>
            ) : (
              <ul className="text-sm divide-y">
                {drilldown.itens.map((it, i) => (
                  <li key={String(it.id ?? it.proposta_id ?? i)} className="py-2">
                    <p className="font-medium">{String(it.titulo ?? it.proposta_id ?? '—')}</p>
                    <p className="text-xs text-[#6B7280]">
                      {String(it.estagio ?? it.status ?? '')}
                      {it.origem ? ` · origem: ${String(it.origem)}` : ''}
                      {it.valor !== undefined ? ` · ${fmtBRL(Number(it.valor) || 0)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
