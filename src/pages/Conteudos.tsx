import { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  PenTool,
  RefreshCw,
  Link2,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  Loader2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { tagProva } from '@/lib/prova'
import { msgErro } from '@/lib/erro'
>>>>>>>

// T3.21 Leva B — criação de conteúdo pela UI (direcionamento da CEO 13/09).
// Formulário MÍNIMO: título, tema, formato, canais, data prevista, série, linha, objetivo.
// Roteiro/legenda/capa/arquivo ficam para o avanço no ciclo de vida — criação não exige.
// Criação em LOTE: várias peças de uma vez (agenda editorial), tudo-ou-nada no backend.
// Edição: título, tema, data prevista e série de peças existentes (PATCH /conteudos/{id}).

type Conteudo = {
  id: string
  titulo_interno: string
  formato: string
  canais_destino: string[]
  tema: string
  status: string
  data_prevista: string
  atrasado: boolean
  serie: string
  campanha: string
}

type Serie = { id: string; nome: string }

const ETAPAS = [
  'ideia',
  'pauta_aprovada',
  'roteiro',
  'producao',
  'edicao',
  'aprovacao',
  'pronto_para_publicar',
  'agendado',
  'publicado',
  'arquivado',
]

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

const linhaLabel: Record<string, string> = {
  bpo_financeiro: 'BPO Financeiro',
  tesouraria: 'Tesouraria',
  controladoria: 'Controladoria',
  cfo_as_a_service: 'CFO as a Service',
  consultoria: 'Consultoria',
  institucional: 'Institucional',
}

const FORMATOS = Object.keys(formatoLabel)
const CANAIS = Object.keys(canalLabel)
const LINHAS = Object.keys(linhaLabel)
const OBJETIVOS: Record<string, string> = {
  autoridade: 'Autoridade',
  geracao_lead: 'Geração de lead',
  engajamento: 'Engajamento',
  venda_direta: 'Venda direta',
  institucional: 'Institucional',
}

const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}

type ItemLote = {
  titulo_interno: string
  tema: string
  formato: string
  canais_destino: string[]
  data_prevista: string
  serie: string
  linha_solucao: string
  objetivo: string
}

const itemVazio = (): ItemLote => ({
  titulo_interno: '',
  tema: '',
  formato: '',
  canais_destino: [],
  data_prevista: '',
  serie: '',
  linha_solucao: 'cfo_as_a_service',
  objetivo: 'autoridade',
})

export default function Conteudos() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
>>>>>>>
  const [itens, setItens] = useState<Conteudo[]>([])
  const [series, setSeries] = useState<Serie[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState<string>('')
  const [avancando, setAvancando] = useState<string>('')

  // ---- criação (individual ou lote) ----
  const [formAberto, setFormAberto] = useState(false)
  const [modoLote, setModoLote] = useState(false)
  const [lote, setLote] = useState<ItemLote[]>([itemVazio()])
  const [salvando, setSalvando] = useState(false)
  const [manterAberto, setManterAberto] = useState(true)

  // ---- edição ----
  const [editId, setEditId] = useState<string>('')
  const [editForm, setEditForm] = useState({
    titulo_interno: '',
    tema: '',
    data_prevista: '',
    serie: '',
  })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await pb.send<{ total: number; itens: Conteudo[] }>('/backend/v1/conteudos', {})
      setItens(r.itens || [])
    } catch (e) {
      toast({
        title: 'Não foi possível carregar os conteúdos',
        description: msgErro(e),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void pb
      .send<{ itens: Serie[] }>('/backend/v1/series', {})
      .then((r) => setSeries(r.itens || []))
      .catch(() => setSeries([]))
    // Criação a partir do dia (CEO 13/09): /conteudos?novo=1&data=YYYY-MM-DD
    // abre o formulário com a data prevista já preenchida.
    if (params.get('novo') === '1') {
      setFormAberto(true)
      const data = params.get('data') || ''
      setLote([{ ...itemVazio(), data_prevista: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : '' }])
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
>>>>>>>

  const gerarLinks = async (id: string) => {
    setGerando(id)
    try {
      await pb.send(`/backend/v1/conteudos/${id}/links`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast({ title: 'Links rastreáveis gerados por canal' })
      await load()
    } catch (e) {
      toast({
        title: 'Não foi possível gerar os links',
        description: msgErro(e),
        variant: 'destructive',
      })
    } finally {
      setGerando('')
    }
  }

  const avancarEtapa = async (id: string, atual: string) => {
    const ix = ETAPAS.indexOf(atual)
    if (ix < 0 || ix >= ETAPAS.length - 1) return
    const destino = ETAPAS[ix + 1]
    setAvancando(id)
    try {
      await pb.send(`/backend/v1/conteudos/${id}/etapa`, {
        method: 'POST',
        body: JSON.stringify({ etapa: destino }),
      })
      toast({ title: `Etapa avançada: ${etapaLabel[destino] || destino}` })
      await load()
    } catch (e) {
      toast({
        title: 'Não foi possível avançar a etapa',
        description: msgErro(e),
        variant: 'destructive',
      })
    } finally {
      setAvancando('')
    }
  }

  // ---- lote ----
  const atualizarItem = (ix: number, campo: keyof ItemLote, valor: string | string[]) => {
    setLote((prev) => prev.map((it, i) => (i === ix ? { ...it, [campo]: valor } : it)))
  }
  const toggleCanal = (ix: number, canal: string) => {
    setLote((prev) =>
      prev.map((it, i) => {
        if (i !== ix) return it
        const tem = (it.canais_destino || []).includes(canal)
        return {
          ...it,
          canais_destino: tem
            ? it.canais_destino.filter((c) => c !== canal)
            : [...it.canais_destino, canal],
        }
      }),
    )
  }
  const salvarLote = async () => {
    setSalvando(true)
    try {
      const payload = {
        itens: lote.map((it) => ({
          ...it,
          data_prevista: it.data_prevista || undefined,
        })),
      }
      const r = await pb.send<{ ok: boolean; criados: number }>('/backend/v1/conteudos/lote', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      toast({ title: `${r.criados} peça(s) criada(s) na etapa Ideia` })
      if (manterAberto && !modoLote) {
        setLote([itemVazio()])
      } else {
        setFormAberto(false)
        setLote([itemVazio()])
      }
      await load()
    } catch (e) {
      toast({
        title: 'Não foi possível criar as peças',
        description: msgErro(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // ---- edição ----
  const abrirEdicao = (c: Conteudo) => {
    setEditId(c.id)
    setEditForm({
      titulo_interno: c.titulo_interno,
      tema: c.tema,
      data_prevista: c.data_prevista ? c.data_prevista.slice(0, 10) : '',
      serie: '',
    })
  }
  const salvarEdicao = async () => {
    if (!editId) return
    setSalvandoEdicao(true)
    try {
      await pb.send(`/backend/v1/conteudos/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo_interno: editForm.titulo_interno,
          tema: editForm.tema,
          ...(editForm.data_prevista ? { data_prevista: editForm.data_prevista } : {}),
        }),
      })
      toast({ title: 'Peça atualizada' })
      setEditId('')
      await load()
    } catch (e) {
      toast({
        title: 'Não foi possível salvar a edição',
        description: msgErro(e),
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const loteValido = lote.every(
    (it) =>
      it.titulo_interno.trim() &&
      it.tema.trim() &&
      it.formato &&
      it.canais_destino.length > 0 &&
      it.data_prevista,
  )

  return (
    <div className="min-h-screen bg-[#FDFCF9] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/home')} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[#0A0A0A]">Conteúdo</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Agenda editorial — do tema ao link rastreável. O CRM decide e registra; a publicação
              segue na ferramenta da social media.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setFormAberto((v) => !v)
                setModoLote(false)
                setLote([itemVazio()])
              }}
              size="sm"
              className="bg-[#0A0A0A] text-[#E8C766] hover:bg-[#222222]"
            >
              <Plus className="w-4 h-4 mr-1" /> Novo conteúdo
            </Button>
            <Button
              onClick={() => navigate('/conteudos/agenda')}
              size="sm"
              className="bg-[#0A0A0A] text-[#E8C766] hover:bg-[#222222]"
            >
              <CalendarDays className="w-4 h-4 mr-1" /> Calendário
            </Button>
            <Button onClick={() => void load()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
          </div>
        </div>

        {formAberto && (
          <section className="mb-6 bg-white border border-[#C9A227]/40 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <h2 className="font-playfair text-lg font-bold">
                {modoLote ? 'Nova agenda — várias peças de uma vez' : 'Nova peça de conteúdo'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModoLote((v) => !v)}
                  className="text-xs font-semibold text-[#A8862B] hover:underline"
                >
                  {modoLote ? 'Criar apenas uma' : 'Criar várias de uma vez'}
                </button>
                <button
                  onClick={() => setFormAberto(false)}
                  className="text-[#6B7280] hover:text-[#0A0A0A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {lote.map((it, ix) => (
                <div key={ix} className="border border-[#E5E7EB] rounded-lg p-3 sm:p-4 relative">
                  {modoLote && lote.length > 1 && (
                    <button
                      onClick={() => setLote((prev) => prev.filter((_, i) => i !== ix))}
                      className="absolute top-2 right-2 text-[#6B7280] hover:text-red-600"
                      title="Remover esta peça"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {modoLote && (
                    <p className="text-xs font-semibold text-[#A8862B] mb-2">Peça {ix + 1}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">Título interno *</span>
                      <input
                        value={it.titulo_interno}
                        onChange={(e) => atualizarItem(ix, 'titulo_interno', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                        placeholder="Ex.: Split payment no Simples: o que muda em 2026"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">
                        Tema *{' '}
                        <span className="font-normal text-[#6B7280]">
                          (assunto curto, máx. 4 palavras — compõe o identificador)
                        </span>
                      </span>
                      <input
                        value={it.tema}
                        onChange={(e) => atualizarItem(ix, 'tema', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                        placeholder="Ex.: split payment"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">Formato *</span>
                      <select
                        value={it.formato}
                        onChange={(e) => atualizarItem(ix, 'formato', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
                      >
                        <option value="">Selecione…</option>
                        {FORMATOS.map((f) => (
                          <option key={f} value={f}>
                            {formatoLabel[f]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">Data prevista *</span>
                      <input
                        type="date"
                        value={it.data_prevista}
                        onChange={(e) => atualizarItem(ix, 'data_prevista', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">
                        Linha de solução *
                      </span>
                      <select
                        value={it.linha_solucao}
                        onChange={(e) => atualizarItem(ix, 'linha_solucao', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
                      >
                        {LINHAS.map((l) => (
                          <option key={l} value={l}>
                            {linhaLabel[l]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">Objetivo *</span>
                      <select
                        value={it.objetivo}
                        onChange={(e) => atualizarItem(ix, 'objetivo', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
                      >
                        {Object.entries(OBJETIVOS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#374151]">
                        Série (quando houver)
                      </span>
                      <select
                        value={it.serie}
                        onChange={(e) => atualizarItem(ix, 'serie', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
                      >
                        <option value="">Nenhuma</option>
                        {series.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <span className="text-xs font-semibold text-[#374151]">
                        Canais de destino *
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {CANAIS.map((c) => {
                          const ativo = (it.canais_destino || []).includes(c)
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleCanal(ix, c)}
                              className={`text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors ${
                                ativo
                                  ? 'bg-[#0A0A0A] text-[#E8C766] border-[#0A0A0A]'
                                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C9A227]'
                              }`}
                            >
                              {canalLabel[c]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-2">
                    Roteiro, legenda, capa e arquivo final entram depois, conforme a peça avança no
                    ciclo de vida.
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {modoLote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLote((prev) => [...prev, itemVazio()])}
                >
                  <Plus className="w-4 h-4 mr-1" /> Adicionar peça
                </Button>
              )}
              {!modoLote && (
                <label className="flex items-center gap-2 text-xs text-[#374151]">
                  <input
                    type="checkbox"
                    checked={manterAberto}
                    onChange={(e) => setManterAberto(e.target.checked)}
                  />
                  Manter o formulário aberto após salvar (lançar a peça seguinte em sequência)
                </label>
              )}
              <Button
                onClick={() => void salvarLote()}
                disabled={!loteValido || salvando}
                className="bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912F] disabled:opacity-50"
                size="sm"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {modoLote ? `Criar ${lote.length} peças` : 'Criar peça'}
              </Button>
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-sm text-[#6B7280]">Carregando...</p>
        ) : itens.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] text-center">
            <PenTool className="w-8 h-8 text-[#A8862B] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">
              Nenhum conteúdo ainda. Use “Novo conteúdo” para criar a primeira peça ou montar a
              agenda de uma vez.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map((c) => {
              const ix = ETAPAS.indexOf(c.status)
              const proxima = ix >= 0 && ix < ETAPAS.length - 1 ? ETAPAS[ix + 1] : ''
              return (
                <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {tagProva(c.titulo_interno, c.tema)}
                    <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold bg-[#0A0A0A] text-[#E8C766]">
                      {etapaLabel[c.status] || c.status}
                    </span>
                    <span className="text-[10px] rounded-full px-2 py-0.5 font-medium bg-white border border-[#E5E7EB] text-[#374151]">
                      {formatoLabel[c.formato] || c.formato}
                    </span>
                    {(c.canais_destino || []).map((ch) => (
                      <span
                        key={ch}
                        className="text-[10px] rounded-full px-2 py-0.5 font-semibold bg-[#F7F5F1] text-[#6B7280]"
                      >
                        {canalLabel[ch] || ch}
                      </span>
                    ))}
                    {c.atrasado && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold bg-red-100 text-red-700">
                        atrasado
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{c.titulo_interno}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {c.tema}
                    {c.serie ? ` · série: ${c.serie}` : ''}
                    {c.campanha ? ` · campanha: ${c.campanha}` : ''}
                    {c.data_prevista ? ` · prevista ${dataBR(c.data_prevista)}` : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {c.status !== 'arquivado' && (
                      <button
                        onClick={() => void gerarLinks(c.id)}
                        disabled={gerando === c.id}
                        className="text-xs font-semibold text-[#A8862B] hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {gerando === c.id ? 'Gerando...' : 'Gerar links rastreáveis'}
                      </button>
                    )}
                    {proxima && proxima !== 'arquivado' && (
                      <button
                        onClick={() => void avancarEtapa(c.id, c.status)}
                        disabled={avancando === c.id}
                        className="text-xs font-semibold text-[#6B7280] hover:text-[#0A0A0A] disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        Avançar p/ {etapaLabel[proxima] || proxima}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => abrirEdicao(c)}
                      className="text-xs font-semibold text-[#6B7280] hover:text-[#0A0A0A]"
                    >
                      Editar
                    </button>
                  </div>
                  {editId === c.id && (
                    <div className="mt-3 border-t border-[#F3F4F6] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-[#374151]">Título interno</span>
                        <input
                          value={editForm.titulo_interno}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, titulo_interno: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-[#374151]">
                          Tema (máx. 4 palavras)
                        </span>
                        <input
                          value={editForm.tema}
                          onChange={(e) => setEditForm((f) => ({ ...f, tema: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-[#374151]">Data prevista</span>
                        <input
                          type="date"
                          value={editForm.data_prevista}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, data_prevista: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
                        />
                      </label>
                      <div className="flex items-end">
                        <Button
                          onClick={() => void salvarEdicao()}
                          disabled={
                            salvandoEdicao ||
                            !editForm.titulo_interno.trim() ||
                            !editForm.tema.trim()
                          }
                          size="sm"
                          className="bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912F] disabled:opacity-50"
                        >
                          {salvandoEdicao ? 'Salvando...' : 'Salvar edição'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
