import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.13 — SPEC-3-013: visão do analista (cap. 6.1 do doc da CEO).
// Fonte única: endpoints da T3.12 (GET /obrigacoes?dia=HOJE[&meus=1] e GET /excecoes).
// NINGUÉM cria obrigação aqui — só baixa (1 toque/lote), bloqueia (motivo) e executa.
// Visual: padrão harmonizado T3.09 (ícone preto + glifo dourado, título bold,
// descrição cinza, CTA dourado, fundo bege claro).

type Obrigacao = {
  id: string
  tipo: string
  cliente: string
  cliente_nome: string
  ficha: string
  responsavel: string
  substituicao_aplicada: boolean
  data_prevista: string
  prazo_limite: string
  status: string
  motivo_bloqueio: string
  etapa?: string
  etapa_em?: string
}
type Excecao = {
  id: string
  cliente?: string
  cliente_nome?: string
  tipo: string
  status: string
  aberta_em?: string
  prazo_alerta?: string
  obrigacao?: string
  escalada_coordenacao?: boolean
  reincidencia?: number
}
type ExcecoesResp = { total: number; itens: Excecao[] }

const tipoLabel: Record<string, string> = {
  coleta_canal: 'Coleta no canal',
  lancamento: 'Lançamento',
  projecao: 'Projeção',
  envio_autorizacao: 'Envio p/ autorização',
  cadastro_banco: 'Cadastro no banco',
  conciliacao: 'Conciliação',
  relatorio_faturamento: 'Relatório de faturamento',
  emissao_nota: 'Emissão de nota',
  entrega_nota: 'Entrega de nota',
  validacao: 'Validação',
  fechamento: 'Fechamento',
  entrega_contabilidade: 'Entrega à contabilidade',
}
const etapaLabel: Record<string, string> = {
  aguardando: 'Aguardando',
  enviada: 'Enviada',
  executada: 'Executada',
  conciliada: 'Conciliada',
  emitida: 'Emitida',
  entregue: 'Entregue',
  aguardando_aceite: 'Aguardando aceite',
  aguardando_aprovacao: 'Aguardando aprovação',
}
const statusLabel: Record<string, string> = {
  prevista: 'Prevista',
  em_execucao: 'Em execução',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
  bloqueada: 'Bloqueada',
  nao_aplicavel: 'N/A',
}
const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}
const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function OperacaoDia() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const meus = params.get('meus') === '1'
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([])
  const [excecoes, setExcecoes] = useState<Excecao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [baixando, setBaixando] = useState<Record<string, boolean>>({})
  const [bloqueioId, setBloqueioId] = useState<string | null>(null)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [etapaId, setEtapaId] = useState<string | null>(null)
  const [etapaSel, setEtapaSel] = useState('')
  const [etapaEvidencia, setEtapaEvidencia] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const dia = hojeISO()
      const r = await pb.send<{ total: number; itens: Obrigacao[] }>(
        `/backend/v1/obrigacoes?dia=${dia}${meus ? '&meus=1' : ''}`,
        {},
      )
      setObrigacoes(r.itens || [])
      try {
        const ex = await pb.send<ExcecoesResp>('/backend/v1/excecoes', {})
        setExcecoes((ex.itens || []).filter((e) => e.status === 'aberta'))
      } catch {
        setExcecoes([])
      }
    } catch {
      setError('Não foi possível carregar a operação do dia. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meus])

  // T3.20 (C-01): atraso é por DATA (atrasada_efetiva do backend) — obrigação atrasada é obrigação de hoje
  const atrasadas = useMemo(
    () => obrigacoes.filter((o) => o.atrasada_efetiva || o.status === 'atrasada'),
    [obrigacoes],
  )
  const doDia = useMemo(
    () => obrigacoes.filter((o) => !o.atrasada_efetiva && o.status !== 'atrasada'),
    [obrigacoes],
  )
  const grupos = useMemo(() => {
    const m = new Map<string, { nome: string; cliente: string; itens: Obrigacao[] }>()
    for (const o of doDia) {
      const key = o.cliente || 'sem_cliente'
      if (!m.has(key))
        m.set(key, { nome: o.cliente_nome || 'Cliente', cliente: o.cliente, itens: [] })
      m.get(key)!.itens.push(o)
    }
    for (const g of m.values()) {
      g.itens.sort((a, b) => String(a.prazo_limite).localeCompare(String(b.prazo_limite)))
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [doDia])

  const baixar = async (o: Obrigacao) => {
    setBaixando((p) => ({ ...p, [o.id]: true }))
    try {
      await pb.send(`/backend/v1/obrigacoes/${o.id}/baixa`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast({ title: `Baixa registrada — ${tipoLabel[o.tipo] || o.tipo}` })
      await load()
    } catch {
      toast({ title: 'Não foi possível baixar a obrigação', variant: 'destructive' })
    } finally {
      setBaixando((p) => ({ ...p, [o.id]: false }))
    }
  }

  const baixarLote = async (cliente: string, itens: Obrigacao[]) => {
    const ids = itens.filter((o) => o.status !== 'bloqueada').map((o) => o.id)
    if (!ids.length) return
    try {
      await pb.send('/backend/v1/obrigacoes/baixa-lote', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      toast({ title: `Baixa em lote: ${ids.length} obrigação(ões)` })
      await load()
    } catch {
      toast({ title: 'Falha na baixa em lote', variant: 'destructive' })
    }
  }

  const marcarEtapa = async () => {
    if (!etapaId || !etapaSel) return
    try {
      await pb.send(`/backend/v1/obrigacoes/${etapaId}/etapa`, {
        method: 'POST',
        body: JSON.stringify({ etapa: etapaSel, evidencia: etapaEvidencia.trim() || undefined }),
      })
      toast({ title: `Etapa marcada: ${etapaLabel[etapaSel] || etapaSel}` })
      setEtapaId(null)
      setEtapaSel('')
      setEtapaEvidencia('')
      await load()
    } catch {
      toast({ title: 'Não foi possível marcar a etapa', variant: 'destructive' })
    }
  }

  const bloquear = async () => {
    if (!bloqueioId) return
    const motivo = motivoBloqueio.trim()
    if (motivo.length < 5) {
      toast({
        title: 'Motivo do bloqueio é obrigatório (mín. 5 caracteres)',
        variant: 'destructive',
      })
      return
    }
    try {
      await pb.send(`/backend/v1/obrigacoes/${bloqueioId}/bloquear`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      })
      toast({ title: 'Obrigação bloqueada' })
      setBloqueioId(null)
      setMotivoBloqueio('')
      await load()
    } catch {
      toast({ title: 'Não foi possível bloquear', variant: 'destructive' })
    }
  }

  const CardObrigacao = ({ o }: { o: Obrigacao }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[10px] rounded-full bg-[#F7F5F1] border border-[#E5E7EB] px-2 py-0.5 font-semibold text-[#6B7280]">
          {tipoLabel[o.tipo] || o.tipo}
        </span>
        {o.status === 'atrasada' && (
          <span className="text-[10px] rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
            Atrasada
          </span>
        )}
        {o.status === 'bloqueada' && (
          <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
            Bloqueada
          </span>
        )}
        {o.substituicao_aplicada && (
          <span className="text-[10px] rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
            Reserva
          </span>
        )}
        <span className="text-[10px] text-[#6B7280]">
          prevista {dataBR(o.data_prevista)} · limite {dataBR(o.prazo_limite)}
        </span>
      </div>
      {o.status === 'bloqueada' && o.motivo_bloqueio && (
        <p className="text-xs text-amber-800 mb-1">Motivo: {o.motivo_bloqueio}</p>
      )}
      {o.etapa && (
        <p className="text-[11px] text-[#6B7280] mb-1">
          Etapa:{' '}
          <span className="font-semibold text-[#0A0A0A]">{etapaLabel[o.etapa] || o.etapa}</span>
          {o.etapa_em && <> · marcada em {dataBR(o.etapa_em)}</>}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        {o.cliente && (
          <button
            onClick={() => navigate(`/ficha-operacional?empresa=${o.cliente}`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A8862B] hover:underline"
            title="Procedimento vigente na ficha operacional"
          >
            <FileText className="w-3.5 h-3.5" /> Procedimento
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          {o.status !== 'bloqueada' && (
            <>
              <button
                onClick={() => {
                  setEtapaId(o.id)
                  setEtapaSel('')
                  setEtapaEvidencia('')
                }}
                className="text-xs border rounded px-2 py-1 font-semibold text-[#6B7280] shrink-0"
                title="Marcar etapa (alimenta as exceções E1–E9)"
              >
                Etapa
              </button>
              <button
                onClick={() => {
                  setBloqueioId(o.id)
                  setMotivoBloqueio('')
                }}
                className="text-xs border rounded px-2 py-1 font-semibold text-amber-700 shrink-0"
              >
                <Ban className="w-3.5 h-3.5 inline" /> Bloquear
              </button>
            </>
          )}
          <button
            onClick={() => void baixar(o)}
            disabled={!!baixando[o.id]}
            className="text-xs rounded px-3 py-1 font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B] disabled:opacity-50 shrink-0"
          >
            {baixando[o.id] ? 'Baixando...' : 'Baixar'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#E8C766]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setParams(meus ? {} : { meus: '1' })}
            className={`text-xs rounded-full px-3 py-1 font-semibold border ${
              meus
                ? 'bg-[#C9A227] text-[#0A0A0A] border-[#C9A227]'
                : 'bg-[#141414] text-[#E8C766] border-[#C9A227]/40'
            }`}
          >
            {meus ? 'Só minhas' : 'Todas'}
          </button>
          <span className="text-xs rounded-full bg-[#141414] border border-[#C9A227]/40 px-3 py-1 text-[#E8C766] font-semibold">
            Operação do dia
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Rotinas geradas pela ficha operacional
        </p>
        <h1 className="font-playfair text-4xl font-bold">Operação do dia</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          O que vence hoje e o que já atrasou — agrupado por cliente. As tarefas chegam prontas do
          motor de rotinas; aqui você baixa, bloqueia e executa. Nada é criado manualmente.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => void load()}
            className="text-xs inline-flex items-center gap-1 border border-[#E5E7EB] rounded px-2 py-1 text-[#6B7280] hover:border-[#C9A227]/60"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        )}
        {!loading && (
          <>
            {/* Bloco de destaque: atrasos + exceções abertas */}
            {(atrasadas.length > 0 || excecoes.length > 0) && (
              <section className="mb-8 rounded-xl border-2 border-red-200 bg-red-50/60 p-5">
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="font-playfair font-bold text-base mb-1">
                  Atenção — atrasos e exceções ({atrasadas.length + excecoes.length})
                </h2>
                <p className="text-xs text-[#6B7280] mb-3">
                  Resolva primeiro o que já passou do prazo limite.
                </p>
                {atrasadas.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {atrasadas.map((o) => (
                      <CardObrigacao key={o.id} o={o} />
                    ))}
                  </div>
                )}
                {excecoes.length > 0 && (
                  <div className="space-y-2">
                    {excecoes.map((e) => (
                      <div
                        key={e.id}
                        className="bg-white border border-red-200 rounded-lg p-3 text-sm"
                      >
                        <span className="text-[10px] rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 mr-2">
                          Exceção
                        </span>
                        <span className="font-semibold">{tipoLabel[e.tipo] || e.tipo}</span>
                        {e.cliente_nome && (
                          <span className="text-[#6B7280]"> · {e.cliente_nome}</span>
                        )}
                        {e.aberta_em && (
                          <span className="text-xs text-[#6B7280]">
                            {' '}
                            · aberta em {dataBR(e.aberta_em)} (data de abertura)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Obrigações do dia agrupadas por cliente */}
            {grupos.length === 0 && atrasadas.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Nada vence hoje{meus ? ' para você' : ''}. Dia limpo.
              </p>
            ) : (
              <div className="space-y-6">
                {grupos.map((g) => (
                  <section
                    key={g.cliente || 'sem_cliente'}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F7F5F1] p-5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-playfair font-bold text-base">{g.nome}</h2>
                          <p className="text-xs text-[#6B7280]">
                            {g.itens.length} obrigação(ões) no ciclo
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => void baixarLote(g.cliente, g.itens)}
                        className="text-xs rounded px-3 py-1.5 font-semibold border border-[#C9A227] text-[#A8862B] hover:bg-[#C9A227]/10"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Baixar tudo
                      </button>
                    </div>
                    <div className="space-y-3">
                      {g.itens.map((o) => (
                        <CardObrigacao key={o.id} o={o} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {/* Modal de etapa (T3.14 — alimenta E1–E9) */}
      {etapaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-2">Marcar etapa</h3>
            <p className="text-xs text-[#6B7280] mb-3">
              A etapa alimenta os gatilhos de exceção (ex.: "Enviada" em uma autorização inicia a
              contagem do prazo de resposta do cliente).
            </p>
            <select
              value={etapaSel}
              onChange={(e) => setEtapaSel(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm mb-2"
            >
              <option value="">Selecione a etapa...</option>
              {Object.entries(etapaLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={etapaEvidencia}
              onChange={(e) => setEtapaEvidencia(e.target.value)}
              placeholder="Evidência (opcional) — ex.: link, protocolo, referência"
              className="w-full border rounded-lg p-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEtapaId(null)}
                className="text-sm px-3 py-1.5 rounded border border-[#E5E7EB] text-[#6B7280]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void marcarEtapa()}
                disabled={!etapaSel}
                className="text-sm px-3 py-1.5 rounded font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B] disabled:opacity-50"
              >
                Marcar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de bloqueio */}
      {bloqueioId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md">
            <h3 className="font-playfair font-bold text-lg mb-2">Bloquear obrigação</h3>
            <p className="text-xs text-[#6B7280] mb-3">
              O motivo é obrigatório e fica registrado na obrigação.
            </p>
            <textarea
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              placeholder="Ex.: cliente não enviou os extratos do banco X"
              className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setBloqueioId(null)}
                className="text-sm px-3 py-1.5 rounded border border-[#E5E7EB] text-[#6B7280]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void bloquear()}
                className="text-sm px-3 py-1.5 rounded font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B]"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
