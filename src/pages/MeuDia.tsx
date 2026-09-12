import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock, AtSign, ListTodo, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.08 — SPEC-3-007: painel "Meu dia" — fila pessoal do usuário logado.
// 3 seções: tarefas abertas (com concluir direto), ações vencidas, menções.
// Somente leitura via /backend/v1/meu-dia (privacidade por auth server-side).
// Visual: primeiro painel no padrão harmonizado (ícone preto + glifo dourado,
// título bold, descrição cinza, CTA dourado, fundo bege claro).

type TarefaItem = {
  id: string
  titulo: string
  negocio: string
  negocio_titulo: string
  prioridade: string
  prazo: string
  atrasada: boolean
  dias_atraso: number
}
type AcaoItem = {
  id: string
  titulo: string
  estagio: string
  proxima_acao_em: string
  proxima_acao_descricao: string
  dias_atraso: number
}
type MencaoItem = {
  id: string
  lida: boolean
  negocio: string
  negocio_titulo: string
  texto: string
  created: string
}
type MeuDia = {
  tarefas_abertas: { total: number; itens: TarefaItem[] }
  acoes_vencidas: { total: number; itens: AcaoItem[] }
  mencoes_recentes: { total: number; itens: MencaoItem[] }
  notificacoes_nao_lidas: number
  fontes_com_erro: string[]
}
type ObrigacaoItem = {
  id: string
  tipo: string
  cliente: string
  cliente_nome: string
  data_prevista: string
  prazo_limite: string
  status: string
}
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

const prioridadeLabel: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}

export default function MeuDia() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data, setData] = useState<MeuDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Record<string, string>>({})
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoItem[]>([])
  const [baixandoOb, setBaixandoOb] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await pb.send<MeuDia>('/backend/v1/meu-dia', {})
      setData(r)
    } catch {
      setError('Não foi possível carregar o seu painel. Tente novamente.')
    } finally {
      setLoading(false)
    }
    // T3.13 — obrigações operacionais do próprio usuário (mesma fonte da T3.12, meus=1)
    try {
      const dia = new Date().toISOString().slice(0, 10)
      const ob = await pb.send<{ total: number; itens: ObrigacaoItem[] }>(
        `/backend/v1/obrigacoes?dia=${dia}&meus=1`,
        {},
      )
      setObrigacoes(ob.itens || [])
    } catch {
      setObrigacoes([])
    }
  }

  const baixarObrigacao = async (o: ObrigacaoItem) => {
    setBaixandoOb((p) => ({ ...p, [o.id]: true }))
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
      setBaixandoOb((p) => ({ ...p, [o.id]: false }))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const concluirTarefa = async (t: TarefaItem) => {
    const res = (resultado[t.id] || '').trim()
    if (res.length < 10)
      return toast({
        title: 'Concluir exige o resultado (mín. 10 caracteres)',
        variant: 'destructive',
      })
    try {
      await pb.collection('tarefas').update(t.id, { status: 'concluida', resultado: res })
      toast({ title: 'Tarefa concluída' })
      setResultado((p) => ({ ...p, [t.id]: '' }))
      await load()
    } catch {
      toast({ title: 'Não foi possível concluir a tarefa', variant: 'destructive' })
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
          Meu dia
        </span>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Fila de trabalho pessoal
        </p>
        <h1 className="font-playfair text-4xl font-bold">Meu dia</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          O que está atribuído a você hoje — tarefas, ações vencidas e menções. Nada aqui é de outra
          pessoa.
        </p>
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
        {data && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Minhas tarefas */}
            <section className="p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB]">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <ListTodo className="w-5 h-5" />
              </div>
              <h2 className="font-playfair font-bold text-base">
                Minhas tarefas ({data.tarefas_abertas.total})
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 mb-3">Tarefas abertas atribuídas a você.</p>
              {data.tarefas_abertas.itens.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Nada pendente. Aproveite o dia.</p>
              ) : (
                <div className="space-y-3">
                  {data.tarefas_abertas.itens.map((t) => (
                    <div key={t.id} className="bg-white border rounded-lg p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                            t.prioridade === 'alta'
                              ? 'bg-red-100'
                              : t.prioridade === 'media'
                                ? 'bg-amber-100'
                                : 'bg-[#F7F5F1]'
                          }`}
                        >
                          {prioridadeLabel[t.prioridade] || t.prioridade}
                        </span>
                        {t.atrasada && (
                          <span className="text-[10px] rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                            {t.dias_atraso}d atrasada
                          </span>
                        )}
                        {t.prazo && !t.atrasada && (
                          <span className="text-[10px] text-[#6B7280]">
                            prazo {dataBR(t.prazo)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold">{t.titulo}</p>
                      <button
                        onClick={() => t.negocio && navigate(`/oportunidades?abrir=${t.negocio}`)}
                        className="text-[10px] text-[#A8862B] font-semibold mt-0.5"
                      >
                        {t.negocio_titulo || 'Abrir oportunidade'} →
                      </button>
                      <div className="mt-2 border-t pt-2 flex gap-2">
                        <input
                          value={resultado[t.id] || ''}
                          onChange={(e) => setResultado((p) => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="O que foi feito? (mín. 10)"
                          className="flex-1 border rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => void concluirTarefa(t)}
                          className="text-xs border rounded px-2 py-1 font-semibold text-green-700 shrink-0"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Ações vencidas */}
            <section className="p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB]">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="font-playfair font-bold text-base">
                Ações vencidas ({data.acoes_vencidas.total})
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 mb-3">
                Próximas ações com data passada nas oportunidades suas.
              </p>
              {data.acoes_vencidas.itens.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Nenhuma ação vencida. Em dia.</p>
              ) : (
                <div className="space-y-3">
                  {data.acoes_vencidas.itens.map((a) => (
                    <div key={a.id} className="bg-white border rounded-lg p-3">
                      <p className="text-sm font-semibold">{a.titulo}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {a.proxima_acao_descricao || 'Próxima ação'} · {dataBR(a.proxima_acao_em)} ·{' '}
                        <span className="text-red-700 font-semibold">{a.dias_atraso}d</span>
                      </p>
                      <button
                        onClick={() => navigate(`/oportunidades?abrir=${a.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-2"
                      >
                        Abrir oportunidade →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Menções */}
            <section className="p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB]">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <AtSign className="w-5 h-5" />
              </div>
              <h2 className="font-playfair font-bold text-base">
                Menções recentes ({data.mencoes_recentes.total})
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 mb-3">
                Últimos 7 dias — alguém citou você em um comentário.
              </p>
              {data.mencoes_recentes.itens.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Nenhuma menção na última semana.</p>
              ) : (
                <div className="space-y-3">
                  {data.mencoes_recentes.itens.map((m) => (
                    <div key={m.id} className="bg-white border rounded-lg p-3">
                      <p className="text-sm font-semibold">{m.negocio_titulo || 'Oportunidade'}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">"{m.texto}"</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#6B7280]">{dataBR(m.created)}</span>
                        <button
                          onClick={() => m.negocio && navigate(`/oportunidades?abrir=${m.negocio}`)}
                          className="text-[10px] font-semibold text-[#A8862B]"
                        >
                          Ver comentário →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        {data && data.fontes_com_erro.length > 0 && (
          <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
            Aviso: algumas fontes falharam na leitura ({data.fontes_com_erro.join(', ')}) — os dados
            exibidos podem estar incompletos.
          </p>
        )}

        {/* T3.13 — Obrigações operacionais (mesma fonte da T3.12, meus=1) */}
        <section className="mt-8 p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-playfair font-bold text-base">
                Obrigações operacionais ({obrigacoes.length})
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 mb-3">
                Rotinas geradas pelo motor a partir da ficha operacional — vencem hoje ou já
                atrasaram, atribuídas a você.
              </p>
            </div>
            <button
              onClick={() => navigate('/operacao-dia')}
              className="text-xs font-semibold text-[#A8862B] hover:underline"
            >
              Ver operação do dia →
            </button>
          </div>
          {obrigacoes.length === 0 ? (
            <p className="text-xs text-[#6B7280]">Nenhuma obrigação pendente para você hoje.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {obrigacoes.map((o) => (
                <div key={o.id} className="bg-white border rounded-lg p-3">
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
                    <span className="text-[10px] text-[#6B7280]">
                      limite {dataBR(o.prazo_limite)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{o.cliente_nome || 'Cliente'}</p>
                  <button
                    onClick={() => void baixarObrigacao(o)}
                    disabled={!!baixandoOb[o.id]}
                    className="mt-2 text-xs rounded px-3 py-1 font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B] disabled:opacity-50"
                  >
                    {baixandoOb[o.id] ? 'Baixando...' : 'Baixar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
