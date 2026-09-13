import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { msgErro } from '@/lib/erro'
import { tagProva } from '@/lib/prova'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// T3.21 Leva B — SPEC-3-021B Visão 2: Calendário mensal + painel do dia.
// Fonte única: GET /backend/v1/agenda-conteudos?mes=YYYY-MM (mesma base do módulo,
// sem duplicação). Clique na data abre o painel do dia com todas as peças previstas:
// título, canal, formato, etapa, pacote, link rastreável com cópia e url de publicação.
// Ajustes da CEO (13/09): rótulos por extenso; destaque de seleção só com conteúdo;
// previsto × publicado distintos (publicado em verde com a data efetiva).
// Botão "Novo conteúdo" leva à criação na tela /conteudos.

type ItemAgenda = {
  id: string
  titulo_interno: string
  tema: string
  formato: string
  canais_destino: string[]
  status: string
  data_prevista: string
  data_efetiva: string
  atrasado: boolean
  serie: string
  campanha: string
  campanha_slug: string
  responsavel_producao_nome: string
  links_rastreaveis: Record<string, string>
  url_publicacao: Record<string, string>
  pacote_completo: boolean
}
type DiaAgenda = { planejadas: number; publicadas: number; atrasadas: number; itens: ItemAgenda[] }
type RespAgenda = { mes: string; total: number; dias: Record<string, DiaAgenda> }

const etapaLabel: Record<string, string> = {
  ideia: 'Ideia',
  pauta_aprovada: 'Pauta aprovada',
  roteiro: 'Roteiro',
  producao: 'Produção',
  edicao: 'Edição',
  aprovacao: 'Aprovação',
  pronto_para_publicar: 'Pronto p/ publicar',
  agendado: 'Agendado',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}
const formatoLabel: Record<string, string> = {
  post_estatico: 'Post estático',
  carrossel: 'Carrossel',
  reel: 'Reel',
  video_longo: 'Vídeo longo',
  artigo: 'Artigo',
  newsletter: 'Newsletter',
  story: 'Story',
  live: 'Live',
}
const canalLabel: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  newsletter: 'Newsletter',
  site: 'Site',
}

const mesAtual = () => format(new Date(), 'yyyy-MM')

export default function AgendaEditorial() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mes, setMes] = useState(mesAtual())
  const [dias, setDias] = useState<Record<string, DiaAgenda>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [diaSel, setDiaSel] = useState<string>('')

  const load = async (m: string) => {
    setLoading(true)
    setErro('')
    try {
      const r = await pb.send<RespAgenda>(`/backend/v1/agenda-conteudos?mes=${m}`, {})
      setDias(r.dias || {})
      setTotal(r.total || 0)
    } catch (e) {
      setDias({})
      setTotal(0)
      setErro(msgErro(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(mes)
  }, [mes])

  const celulas = useMemo(() => {
    const [a, m] = mes.split('-').map(Number)
    const base = new Date(a, (m || 1) - 1, 15)
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(base), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(base), { weekStartsOn: 0 }),
    })
  }, [mes])

  const itensDia = diaSel ? dias[diaSel]?.itens || [] : []

  const copiar = async (texto: string, rotulo: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      toast({ title: `Link copiado — ${rotulo}` })
    } catch {
      toast({
        title: 'Não foi possível copiar — selecione e copie manualmente.',
        variant: 'destructive',
      })
    }
  }

  const mesLabel = useMemo(() => {
    const [a, m] = mes.split('-').map(Number)
    return format(new Date(a, (m || 1) - 1, 15), "MMMM 'de' yyyy", { locale: ptBR })
  }, [mes])

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/conteudos')}
          className="flex items-center gap-2 text-sm text-[#E8C766]"
        >
          <ArrowLeft className="w-4 h-4" /> Conteúdo
        </button>
        <span className="text-xs rounded-full bg-[#141414] border border-[#C9A227]/40 px-3 py-1 text-[#E8C766] font-semibold">
          Agenda editorial
        </span>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Visão 2 — operação diária
        </p>
        <h1 className="font-playfair text-4xl font-bold">Calendário editorial</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Clique em uma data para abrir o painel do dia com todas as peças previstas.
        </p>

        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMes(format(addMonths(parseISO(mes + '-15'), -1), 'yyyy-MM'))}
              className="p-2 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#C9A227]"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-playfair text-lg font-bold capitalize min-w-[10rem] text-center">
              {mesLabel}
            </span>
            <button
              onClick={() => setMes(format(addMonths(parseISO(mes + '-15'), 1), 'yyyy-MM'))}
              className="p-2 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#C9A227]"
              title="Mês seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMes(mesAtual())}
              className="text-xs rounded-full px-3 py-1.5 font-semibold border border-[#C9A227]/40 bg-[#141414] text-[#E8C766]"
            >
              Hoje
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/conteudos?novo=1')}
              className="text-xs rounded-full px-3 py-1.5 font-semibold bg-[#0A0A0A] text-[#E8C766] inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Novo conteúdo
            </button>
            <button
              onClick={() => void load(mes)}
              className="text-xs font-semibold text-[#A8862B] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Carregando agenda...</p>
        ) : erro ? (
          <div className="p-6 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-semibold">
              Não foi possível carregar a agenda.
            </p>
            <p className="text-xs text-red-600 mt-1">{erro}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] py-1"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {celulas.map((d) => {
                const chave = format(d, 'yyyy-MM-dd')
                const info = dias[chave]
                const noMes = isSameMonth(d, parseISO(mes + '-15'))
                const sel = diaSel === chave
                return (
                  <button
                    key={chave}
                    onClick={() => setDiaSel(sel ? '' : chave)}
                    className={`min-h-[4.5rem] sm:min-h-[5.5rem] p-1.5 sm:p-2 rounded-lg border text-left transition-all ${
                      sel && info
                        ? 'border-[#C9A227] bg-[#FDF6E3] ring-1 ring-[#C9A227]'
                        : info
                          ? 'border-[#E5E7EB] bg-white hover:border-[#C9A227]/60'
                          : 'border-[#E5E7EB]/60 bg-white/50'
                    } ${noMes ? '' : 'opacity-40'}`}
                  >
                    <span
                      className={`text-xs font-bold ${isToday(d) ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0A0A0A] text-[#E8C766]' : 'text-[#0A0A0A]'}`}
                    >
                      {format(d, 'd')}
                    </span>
                    {info && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {info.planejadas > 0 && (
                          <span className="text-[9px] rounded-full px-1.5 py-0.5 font-semibold bg-[#F7F5F1] text-[#374151] border border-[#E5E7EB]">
                            {info.planejadas} prevista{info.planejadas > 1 ? 's' : ''}
                          </span>
                        )}
                        {info.publicadas > 0 && (
                          <span className="text-[9px] rounded-full px-1.5 py-0.5 font-semibold bg-emerald-100 text-emerald-700">
                            {info.publicadas} publicada{info.publicadas > 1 ? 's' : ''}
                          </span>
                        )}
                        {info.atrasadas > 0 && (
                          <span className="text-[9px] rounded-full px-1.5 py-0.5 font-semibold bg-red-100 text-red-700">
                            {info.atrasadas} atrasada{info.atrasadas > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {total === 0 && (
              <div className="mt-6 p-8 rounded-xl bg-white border border-[#E5E7EB] text-center">
                <CalendarDays className="w-8 h-8 text-[#A8862B] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">
                  Nenhuma peça prevista em {mesLabel}. Peças aparecem aqui quando têm data prevista
                  definida.
                </p>
              </div>
            )}

            {diaSel && (
              <section className="mt-6 bg-white border border-[#C9A227]/40 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                  <h2 className="font-playfair text-xl font-bold capitalize">
                    {format(parseISO(diaSel), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <button
                    onClick={() => setDiaSel('')}
                    className="text-xs text-[#6B7280] hover:text-[#0A0A0A]"
                  >
                    Fechar painel
                  </button>
                </div>
                {itensDia.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Nenhuma peça prevista neste dia.</p>
                ) : (
                  <div className="space-y-3">
                    {itensDia.map((it) => (
                      <div key={it.id} className="border border-[#E5E7EB] rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {tagProva(it.titulo_interno, it.tema)}
                          <span
                            className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                              it.status === 'publicado'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#0A0A0A] text-[#E8C766]'
                            }`}
                          >
                            {it.status === 'publicado'
                              ? `Publicado em ${it.data_efetiva ? format(parseISO(it.data_efetiva), 'dd/MM') : '—'}`
                              : `Prevista · ${etapaLabel[it.status] || it.status}`}
                          </span>
                          <span className="text-[10px] rounded-full px-2 py-0.5 font-medium bg-white border border-[#E5E7EB] text-[#374151]">
                            {formatoLabel[it.formato] || it.formato}
                          </span>
                          {(it.canais_destino || []).map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] rounded-full px-2 py-0.5 font-semibold bg-[#F7F5F1] text-[#6B7280]"
                            >
                              {canalLabel[ch] || ch}
                            </span>
                          ))}
                          {it.atrasado && (
                            <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold bg-red-100 text-red-700">
                              atrasado
                            </span>
                          )}
                          <span className="text-[10px] inline-flex items-center gap-1 font-semibold">
                            {it.pacote_completo ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <PackageCheck className="w-3.5 h-3.5" /> pacote completo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <PackageX className="w-3.5 h-3.5" /> pacote incompleto
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{it.titulo_interno}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {it.tema}
                          {it.serie ? ` · série: ${it.serie}` : ''}
                          {it.campanha ? ` · campanha: ${it.campanha}` : ''}
                          {it.responsavel_producao_nome
                            ? ` · resp.: ${it.responsavel_producao_nome}`
                            : ''}
                          {it.data_efetiva
                            ? ` · publicada em ${format(parseISO(it.data_efetiva), 'dd/MM/yyyy')}`
                            : ''}
                        </p>
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          {Object.entries(it.links_rastreaveis || {}).map(([canal, url]) => (
                            <button
                              key={canal}
                              onClick={() => void copiar(url, canalLabel[canal] || canal)}
                              className="text-xs font-semibold text-[#A8862B] hover:underline inline-flex items-center gap-1"
                              title={url}
                            >
                              <Link2 className="w-3.5 h-3.5" /> Copiar link{' '}
                              {canalLabel[canal] || canal}
                              <Copy className="w-3 h-3" />
                            </button>
                          ))}
                          {Object.entries(it.url_publicacao || {}).map(([canal, url]) => (
                            <a
                              key={canal}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Publicado em{' '}
                              {canalLabel[canal] || canal}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
