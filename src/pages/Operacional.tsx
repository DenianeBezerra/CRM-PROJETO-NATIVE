import React, { useEffect, useState } from 'react'
import { ArrowLeft, Clock, Flag, PauseCircle, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

type StageTime = { etapa: string; nome: string; segundos: number }
type AutomacaoItem = {
  id: string
  negocio: string
  negocio_titulo: string
  responsavel: string
  detalhe: Record<string, unknown>
  created: string
}
type AutomacoesDia = {
  dia: string
  regras: Record<string, { total: number; itens: AutomacaoItem[] }>
}
type QueueItem = {
  id: string
  titulo: string
  estagio?: string
  proxima_acao_em?: string
  proxima_acao_descricao?: string
  dias_na_etapa?: number
  limite_dias?: number
}
type TarefaVencida = {
  tarefa: string
  negocio: string
  titulo_negocio: string
  titulo_tarefa: string
  prioridade: string
  prazo: string
}
type SemProximaAcao = {
  negocio: string
  titulo: string
  estagio: string
  proxima_acao_em: string
}
type ExcecaoVigente = {
  excecao: string
  negocio: string
  titulo_negocio: string
  motivo: string
  validade: string
}
type FilasOperacionais = {
  tarefas_vencidas: { itens: TarefaVencida[]; total: number }
  sem_proxima_acao: { itens: SemProximaAcao[]; total: number }
  excecoes_vigentes: { itens: ExcecaoVigente[]; total: number }
}
type Resumo = {
  oportunidades_ativas: number
  arquivadas: number
  fechado_ganho: number
  fechado_perdido: number
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days} d`)
  if (hours) parts.push(`${hours} h`)
  if (!days && minutes) parts.push(`${minutes} min`)
  return parts.join(' ') || '< 1 min'
}

export default function Operacional() {
  const navigate = useNavigate()
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [etapas, setEtapas] = useState<StageTime[]>([])
  const [vencidas, setVencidas] = useState<QueueItem[]>([])
  const [paradas, setParadas] = useState<QueueItem[]>([])
  const [limiteDias, setLimiteDias] = useState<number | null>(null)
  const [estadoInvalido, setEstadoInvalido] = useState<string[]>([])
  const [filas, setFilas] = useState<FilasOperacionais | null>(null)
  const [automacoes, setAutomacoes] = useState<AutomacoesDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [resumoData, tempoData, vencidasData, paradasData, filasData, automacoesData] =
          await Promise.all([
            pb.send<Resumo>('/backend/v1/operacional/resumo', {}),
            pb.send<{ etapas: StageTime[]; estado_invalido: string[] }>(
              '/backend/v1/operacional/tempo-por-etapa',
              {},
            ),
            pb.send<{ total: number; itens: QueueItem[] }>(
              '/backend/v1/operacional/acoes-vencidas',
              {},
            ),
            pb.send<{ limite_dias: number; total: number; itens: QueueItem[] }>(
              '/backend/v1/operacional/paradas',
              {},
            ),
            pb.send<FilasOperacionais>('/backend/v1/filas/operacionais', {}),
            pb.send<AutomacoesDia>('/backend/v1/automacoes/execucoes', {}),
          ])
        setResumo(resumoData)
        setEtapas(tempoData.etapas || [])
        setEstadoInvalido(tempoData.estado_invalido || [])
        setVencidas(vencidasData.itens || [])
        setParadas(paradasData.itens || [])
        setLimiteDias(paradasData.limite_dias ?? null)
        setFilas(filasData)
        setAutomacoes(automacoesData)
      } catch {
        setError('Não foi possível carregar os indicadores operacionais.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const stageName = (key: string) => etapas.find((s) => s.etapa === key)?.nome || key

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-xs rounded-full bg-white border border-[#C9A227]/40 px-3 py-1 text-[#A8862B] font-semibold">
          Área operacional protegida
        </span>
      </header>
      <main className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Central Comercial
        </p>
        <h1 className="font-playfair text-4xl font-bold">Painel operacional</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Contadores, tempo por etapa e filas de atenção. O tempo é apurado a partir da implantação
          do histórico — períodos anteriores não são retroativos.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {estadoInvalido.length > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Estado inválido detectado em {estadoInvalido.length} oportunidade(s): há mais de uma
            permanência aberta registrada. Os cálculos sinalizam o caso em vez de somar duas vezes.
          </p>
        )}
        {loading ? (
          <p>Carregando indicadores...</p>
        ) : (
          <>
            <section className="bg-white border rounded-xl p-5 mb-8">
              <h2 className="font-playfair text-xl font-bold mb-1">Automações de hoje</h2>
              <p className="text-xs text-[#6B7280] mb-4">
                Detecções automáticas do dia (cron 08:05 BRT): follow-up de proposta sem resposta e
                alertas de saúde da oportunidade. Nada é alterado — o time age sobre a lista.
              </p>
              {automacoes ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      [
                        'follow_up_proposta',
                        'Follow-up de proposta',
                        'Proposta emitida há 3+ dias sem decisão',
                      ],
                      [
                        'follow_up_sem_resposta',
                        'Sem resposta (SLA)',
                        'Proposta emitida há 7+ dias sem decisão',
                      ],
                      [
                        'alerta_sem_proxima_acao',
                        'Sem próxima ação',
                        'Oportunidade ativa sem próxima ação futura',
                      ],
                      [
                        'alerta_parada',
                        'Oportunidade parada',
                        'Na mesma etapa acima do limite configurado',
                      ],
                    ] as [string, string, string][]
                  ).map(([chave, titulo, desc]) => {
                    const bloco = automacoes.regras[chave] || { total: 0, itens: [] }
                    return (
                      <div key={chave} className="border rounded-xl p-4">
                        <p className="text-sm font-semibold mb-1">
                          {titulo}{' '}
                          <span
                            className={
                              bloco.total > 0
                                ? 'text-[#B91C1C] font-bold'
                                : 'text-[#6B7280] font-bold'
                            }
                          >
                            {bloco.total}
                          </span>
                        </p>
                        <p className="text-xs text-[#6B7280] mb-3">{desc}</p>
                        {bloco.itens.length ? (
                          <ul className="space-y-1">
                            {bloco.itens.slice(0, 5).map((it) => (
                              <li key={it.id}>
                                <button
                                  onClick={() => navigate('/oportunidades')}
                                  className="text-xs text-left text-[#A8862B] hover:underline"
                                >
                                  {it.negocio_titulo || 'Oportunidade'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#6B7280]">Nada disparou hoje.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280]">Carregando automações...</p>
              )}
            </section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#A8862B] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Ativas</span>
                </div>
                <p className="font-playfair text-3xl font-bold">
                  {resumo?.oportunidades_ativas ?? '—'}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">Exclui arquivadas e estados finais</p>
              </div>
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#A8862B] mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Arquivadas</span>
                </div>
                <p className="font-playfair text-3xl font-bold">{resumo?.arquivadas ?? '—'}</p>
                <p className="text-xs text-[#6B7280] mt-1">Fora do contador de ativas</p>
              </div>
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#A8862B] mb-2">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Ganhas</span>
                </div>
                <p className="font-playfair text-3xl font-bold">{resumo?.fechado_ganho ?? '—'}</p>
              </div>
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#A8862B] mb-2">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Perdidas</span>
                </div>
                <p className="font-playfair text-3xl font-bold">{resumo?.fechado_perdido ?? '—'}</p>
              </div>
            </div>

            <section className="bg-white border rounded-xl p-5 mb-8">
              <h2 className="font-playfair text-xl font-bold mb-1">Tempo acumulado por etapa</h2>
              <p className="text-xs text-[#6B7280] mb-4">
                Soma dos intervalos encerrados + intervalo aberto até o momento da consulta.
              </p>
              {etapas.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  Nenhum dado de permanência registrado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {etapas.map((stage) => (
                    <div
                      key={stage.etapa}
                      className="flex items-center justify-between border-b border-[#E5E7EB] pb-2 last:border-0"
                    >
                      <span className="text-sm font-medium">{stage.nome}</span>
                      <span className="text-sm text-[#6B7280]">
                        {formatDuration(stage.segundos)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border rounded-xl p-5 mb-8">
              <h2 className="font-playfair text-xl font-bold mb-1">Filas distintas</h2>
              <p className="text-xs text-[#6B7280] mb-4">
                Tarefas vencidas, oportunidades sem próxima ação e exceções vigentes — critérios
                explícitos e reproduzíveis. A fila de exceções é administrativa (visível só para
                administrador).
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="border rounded-xl p-4">
                  <p className="text-sm font-semibold mb-1">
                    Tarefas vencidas{' '}
                    <span className="text-[#A8862B] font-bold">
                      {filas?.tarefas_vencidas.total ?? 0}
                    </span>
                  </p>
                  <p className="text-xs text-[#6B7280] mb-3">Tarefa aberta com prazo no passado.</p>
                  {filas?.tarefas_vencidas.itens.length ? (
                    <ul className="space-y-2">
                      {filas.tarefas_vencidas.itens.map((t) => (
                        <li
                          key={t.tarefa}
                          className="text-xs border-b border-[#E5E7EB] pb-2 last:border-0"
                        >
                          <button
                            onClick={() => navigate(`/oportunidades?destaque=${t.negocio}`)}
                            className="font-semibold text-[#A8862B] hover:underline text-left"
                          >
                            {t.titulo_tarefa}
                          </button>
                          <p className="text-[#6B7280]">
                            {t.titulo_negocio} · prazo{' '}
                            {t.prazo
                              ? new Date(t.prazo.replace(' ', 'T')).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B7280]">Nenhuma tarefa vencida.</p>
                  )}
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-sm font-semibold mb-1">
                    Sem próxima ação{' '}
                    <span className="text-[#A8862B] font-bold">
                      {filas?.sem_proxima_acao.total ?? 0}
                    </span>
                  </p>
                  <p className="text-xs text-[#6B7280] mb-3">
                    Oportunidade ativa sem próxima ação futura e sem exceção vigente.
                  </p>
                  {filas?.sem_proxima_acao.itens.length ? (
                    <ul className="space-y-2">
                      {filas.sem_proxima_acao.itens.map((o) => (
                        <li
                          key={o.negocio}
                          className="text-xs border-b border-[#E5E7EB] pb-2 last:border-0"
                        >
                          <button
                            onClick={() => navigate(`/oportunidades?destaque=${o.negocio}`)}
                            className="font-semibold text-[#A8862B] hover:underline text-left"
                          >
                            {o.titulo}
                          </button>
                          <p className="text-[#6B7280]">{stageName(o.estagio)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B7280]">Nenhuma oportunidade na fila.</p>
                  )}
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-sm font-semibold mb-1">
                    Exceções vigentes{' '}
                    <span className="text-[#A8862B] font-bold">
                      {filas?.excecoes_vigentes.total ?? 0}
                    </span>
                  </p>
                  <p className="text-xs text-[#6B7280] mb-3">
                    Liberações administrativas com validade futura. Fila administrativa.
                  </p>
                  {filas?.excecoes_vigentes.itens.length ? (
                    <ul className="space-y-2">
                      {filas.excecoes_vigentes.itens.map((x) => (
                        <li
                          key={x.excecao}
                          className="text-xs border-b border-[#E5E7EB] pb-2 last:border-0"
                        >
                          <button
                            onClick={() => navigate(`/oportunidades?destaque=${x.negocio}`)}
                            className="font-semibold text-[#A8862B] hover:underline text-left"
                          >
                            {x.titulo_negocio}
                          </button>
                          <p className="text-[#6B7280]">
                            até{' '}
                            {x.validade
                              ? new Date(x.validade.replace(' ', 'T')).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B7280]">Nenhuma exceção vigente.</p>
                  )}
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="bg-white border rounded-xl p-5">
                <h2 className="font-playfair text-xl font-bold mb-1">Próximas ações vencidas</h2>
                <p className="text-xs text-[#6B7280] mb-4">
                  Ações com data passada. Ação futura não entra nesta fila.
                </p>
                {vencidas.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Nenhuma ação vencida.</p>
                ) : (
                  <ul className="space-y-3">
                    {vencidas.map((item) => (
                      <li key={item.id} className="border-b border-[#E5E7EB] pb-3 last:border-0">
                        <button
                          onClick={() => navigate(`/oportunidades?destaque=${item.id}`)}
                          className="text-sm font-semibold text-[#A8862B] hover:underline text-left"
                        >
                          {item.titulo}
                        </button>
                        <p className="text-xs text-[#6B7280]">
                          {stageName(item.estagio || '')} ·{' '}
                          {item.proxima_acao_em
                            ? new Date(item.proxima_acao_em).toLocaleString('pt-BR')
                            : '—'}
                        </p>
                        {item.proxima_acao_descricao && (
                          <p className="text-xs mt-1">{item.proxima_acao_descricao}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-white border rounded-xl p-5">
                <h2 className="font-playfair text-xl font-bold mb-1 flex items-center gap-2">
                  <PauseCircle className="w-5 h-5 text-[#A8862B]" /> Oportunidades paradas
                </h2>
                <p className="text-xs text-[#6B7280] mb-4">
                  Acima do limite configurável de {limiteDias ?? '—'} dias na etapa atual.
                </p>
                {paradas.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Nenhuma oportunidade parada.</p>
                ) : (
                  <ul className="space-y-3">
                    {paradas.map((item) => (
                      <li key={item.id} className="border-b border-[#E5E7EB] pb-3 last:border-0">
                        <button
                          onClick={() => navigate(`/oportunidades?destaque=${item.id}`)}
                          className="text-sm font-semibold text-[#A8862B] hover:underline text-left"
                        >
                          {item.titulo}
                        </button>
                        <p className="text-xs text-[#6B7280]">
                          {stageName(item.estagio || '')} · {item.dias_na_etapa} dias na etapa
                          (limite {item.limite_dias})
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
