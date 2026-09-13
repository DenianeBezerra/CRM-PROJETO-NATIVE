import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PenTool, RefreshCw, Link2, ChevronRight, CalendarDays } from 'lucide-react'
>>>>>>>
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { tagProva } from '@/lib/prova'

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

const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}

const msgErro = (e: unknown): string => {
  const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string }
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Não foi possível concluir a operação.'
  )
}

export default function Conteudos() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [itens, setItens] = useState<Conteudo[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState<string>('')
  const [avancando, setAvancando] = useState<string>('')

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
  }, [])

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
            <Button onClick={() => navigate('/conteudos/agenda')} size="sm" className="bg-[#0A0A0A] text-[#E8C766] hover:bg-[#222]">
              <CalendarDays className="w-4 h-4 mr-1" /> Calendário
            </Button>
            <Button onClick={() => void load()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
          </div>
>>>>>>>
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Carregando...</p>
        ) : itens.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] text-center">
            <PenTool className="w-8 h-8 text-[#A8862B] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">
              Nenhum conteúdo ainda. A criação pela API já está ativa — a tela de cadastro completa
              chega na próxima leva.
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
