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
        </div>

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
                value={fmtDur(dados.primeira_resposta.p50_segundos)}
                n={dados.primeira_resposta.n}
              />
              <Num
                label="Propostas (N)"
                value={String(dados.propostas_ciclo.n)}
                n={fmtBRL(dados.propostas_ciclo.valor_total)}
              />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Bloco
                titulo={`Leads por origem (N=${dados.leads_por_origem.n})`}
                cobertura={dados.cobertura_por_bloco?.leads_por_origem}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.leads_por_origem.por_origem).map(([o, v]) => (
                    <li key={o} className="flex justify-between">
                      <span className="capitalize">{o.replace('_', ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
                  {dados.leads_por_origem.n === 0 && (
                    <li className="text-[#6B7280] text-xs">Nenhum lead no filtro atual.</li>
                  )}
                </ul>
              </Bloco>
              <Bloco
                titulo={`Oportunidades por etapa (N=${dados.oportunidades_por_etapa.n})`}
                cobertura={dados.cobertura_por_bloco?.oportunidades_por_etapa}
              >
                <ul className="text-sm space-y-1">
                  {Object.entries(dados.oportunidades_por_etapa.por_etapa).map(([e, v]) => (
                    <li key={e} className="flex justify-between">
                      <span>{e}</span>
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
                      <span>{e}</span>
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
                        <span className="capitalize">{s}</span>
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
                    <li key={m} className="flex justify-between">
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
          </div>
        ) : null}
      </main>
    </div>
  )
}
