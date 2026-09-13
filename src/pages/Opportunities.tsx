import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Briefcase,
  Calculator,
  LineChart,
  Pencil,
  Plus,
  Search,
  UserCog,
  X,
  CircleDot,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import QualificacaoNegocio from '@/components/QualificacaoNegocio'
import DiagnosticoNegocio from '@/components/DiagnosticoNegocio'
import Consulta360Negocio from '@/components/Consulta360Negocio'
import PropostaNegocio from '@/components/PropostaNegocio'
import TarefasNegocio from '@/components/TarefasNegocio'
import FormularioNegocio from '@/components/FormularioNegocio'
import FichaPropostaNegocio from '@/components/FichaPropostaNegocio'
import WhatsAppNegocio from '@/components/WhatsAppNegocio'
import TimelineNegocio from '@/components/TimelineNegocio'
import EmailNegocio from '@/components/EmailNegocio'
import ComentariosNegocio from '@/components/ComentariosNegocio'
import ContratoNegocio from '@/components/ContratoNegocio'
import ContratoNegocio from '@/components/ContratoNegocio'

type Oportunidade = {
  id: string
  titulo: string
  cliente: string
  cliente_nome?: string
  valor?: number
  estagio?: string
  probabilidade?: number
  data_fechamento_previsto?: string
  observacoes?: string
  motivo_perda?: string
  motivo_perda_detalhe?: string
  data_ganho?: string
  observacao_ganho?: string
  justificativa_reabertura?: string
  proxima_acao_em?: string
  proxima_acao_descricao?: string
  arquivado?: boolean
  origem?: string
  canal?: string
  origem_especifica?: string
  campanha?: string
  conteudo?: string
  motivo_ganho?: string
  motivo_ganho_detalhe?: string
  tags?: string
  responsavel?: string
  responsavel_nome?: string
  prioridade?: string
  score?: number
  servico?: string
  status?: string
  data_entrada?: string
}
type Cliente = { id: string; nome: string }
type Usuario = { id: string; name: string }
type Etapa = { chave: string; nome: string; ordem: number; ativa: boolean }
const fallbackStages = [
  { chave: 'novo', nome: 'Novo', ordem: 10, ativa: true },
  { chave: 'contato_feito', nome: 'Contato feito', ordem: 20, ativa: true },
  { chave: 'proposta', nome: 'Proposta', ordem: 30, ativa: true },
  { chave: 'fechado_ganho', nome: 'Fechado ganho', ordem: 40, ativa: true },
  { chave: 'fechado_perdido', nome: 'Fechado perdido', ordem: 50, ativa: true },
]
const origemOptions = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'redes_sociais', label: 'Redes sociais' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
]
// T3.01 — atribuição granular: canal → origem específica → campanha → conteúdo
const canalOptions = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'site', label: 'Site' },
  { value: 'google', label: 'Google' },
  { value: 'pagina_captura', label: 'Página de captura' },
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'evento', label: 'Evento' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'trafego_pago', label: 'Tráfego pago' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outro', label: 'Outro' },
]
// T3.01 — motivo de ganho estruturado (espelho do motivo de perda)
const motivoGanhoOptions = [
  { value: 'preco', label: 'Preço' },
  { value: 'escopo', label: 'Escopo' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'urgencia', label: 'Urgência' },
  { value: 'indicacao_interna', label: 'Indicação interna' },
  { value: 'outro', label: 'Outro' },
]
const prioridadeOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
]
const servicoOptions = [
  { value: 'bpo_financeiro', label: 'BPO Financeiro' },
  { value: 'tesouraria', label: 'Tesouraria' },
  { value: 'controladoria', label: 'Controladoria' },
  { value: 'cfo_as_a_service', label: 'CFO as a Service' },
  { value: 'outro', label: 'Outro' },
]
// T3.09 — harmonização visual: ícone por serviço (quadrado preto + glifo dourado,
// padrão dos cards de módulo da home).
const servicoIcone: Record<string, React.ComponentType<{ className?: string }>> = {
  bpo_financeiro: Briefcase,
  tesouraria: LineChart,
  controladoria: Calculator,
  cfo_as_a_service: UserCog,
  outro: CircleDot,
}
const statusOptions = [
  { value: 'em_aberto', label: 'Em aberto' },
  { value: 'em_negociacao', label: 'Em negociação' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' },
]
const emptyForm = {
  titulo: '',
  cliente: '',
  valor: '',
  estagio: 'novo',
  probabilidade: '0',
  data_fechamento_previsto: '',
  observacoes: '',
  motivo_perda: '',
  motivo_perda_detalhe: '',
  data_ganho: '',
  observacao_ganho: '',
  justificativa_reabertura: '',
  proxima_acao_em: '',
  proxima_acao_descricao: '',
  arquivado: 'false',
  origem: '',
  canal: '',
  origem_especifica: '',
  campanha: '',
  conteudo: '',
  motivo_ganho: '',
  motivo_ganho_detalhe: '',
  tags: '',
  responsavel: '',
  prioridade: '',
  score: '',
  servico: '',
  status: '',
  data_entrada: '',
}

export default function Opportunities() {
  const navigate = useNavigate()
  useEffect(() => {
    const fechar = () => setMenuAberto(null)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [])
  const { toast } = useToast()
  const [items, setItems] = useState<Oportunidade[]>([])
  const [clients, setClients] = useState<Cliente[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [stages, setStages] = useState<Etapa[]>(fallbackStages)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [originalStage, setOriginalStage] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const load = async () => {
    setLoading(true)
    try {
      const [records, contacts] = await Promise.all([
        pb
          .collection('negocios')
          .getFullList<Oportunidade>({ sort: '-created', expand: 'cliente,responsavel' }),
        pb.collection('clientes').getFullList<Cliente>({ sort: 'nome' }),
      ])
      setItems(
        records.map((item) => ({
          ...item,
          cliente_nome: (item as Oportunidade & { expand?: { cliente?: Cliente } }).expand?.cliente
            ?.nome,
          responsavel_nome: (item as Oportunidade & { expand?: { responsavel?: Usuario } }).expand
            ?.responsavel?.name,
        })),
      )
      setClients(contacts)
      try {
        setUsers(await pb.collection('users').getFullList<Usuario>({ sort: 'name' }))
      } catch {
        /* lista de usuários indisponível para o perfil atual */
      }
      try {
        const configured = await pb
          .collection('etapas_negocio')
          .getFullList<Etapa>({ filter: 'ativa = true', sort: 'ordem' })
        if (configured.length) setStages(configured)
      } catch {
        /* compatibilidade enquanto migration não aplicada */
      }
    } catch {
      setError('Não foi possível carregar as oportunidades.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(
      (x) => !q || `${x.titulo} ${x.cliente_nome || ''}`.toLowerCase().includes(q),
    )
  }, [items, search])
  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))
  const reset = () => {
    setEditing(null)
    setOriginalStage('')
    setForm(emptyForm)
    setShowForm(false)
    setError('')
  }
  const openEdit = (item: Oportunidade) => {
    setEditing(item.id)
    setOriginalStage(item.estagio || '')
    setForm({
      titulo: item.titulo || '',
      cliente: item.cliente || '',
      valor: item.valor?.toString() || '',
      estagio: item.estagio || 'novo',
      probabilidade: item.probabilidade?.toString() || '0',
      data_fechamento_previsto: item.data_fechamento_previsto?.slice(0, 10) || '',
      observacoes: item.observacoes || '',
      motivo_perda: item.motivo_perda || '',
      motivo_perda_detalhe: item.motivo_perda_detalhe || '',
      data_ganho: item.data_ganho?.slice(0, 10) || '',
      observacao_ganho: item.observacao_ganho || '',
      justificativa_reabertura: '',
      proxima_acao_em: item.proxima_acao_em ? item.proxima_acao_em.slice(0, 10) : '',
      proxima_acao_descricao: item.proxima_acao_descricao || '',
      arquivado: item.arquivado ? 'true' : 'false',
      origem: item.origem || '',
      canal: item.canal || '',
      origem_especifica: item.origem_especifica || '',
      campanha: item.campanha || '',
      conteudo: item.conteudo || '',
      motivo_ganho: item.motivo_ganho || '',
      motivo_ganho_detalhe: item.motivo_ganho_detalhe || '',
      tags: item.tags || '',
      responsavel: item.responsavel || '',
      prioridade: item.prioridade || '',
      score: item.score?.toString() || '',
      servico: item.servico || '',
      status: item.status || '',
      data_entrada: item.data_entrada ? item.data_entrada.slice(0, 10) : '',
    })
    setShowForm(true)
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.titulo.trim().length < 2) return setError('Informe um título válido.')
    if (!form.cliente) return setError('Selecione um contato.')
    const value = form.valor === '' ? undefined : Number(form.valor)
    const probability = Number(form.probabilidade)
    const score = form.score === '' ? undefined : Number(form.score)
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      return setError('Informe um valor válido.')
    if (!Number.isFinite(probability) || probability < 0 || probability > 100)
      return setError('A probabilidade deve estar entre 0 e 100.')
    if (score !== undefined && (!Number.isFinite(score) || score < 0 || score > 100))
      return setError('O score deve estar entre 0 e 100.')
    if (form.estagio === 'fechado_perdido' && !form.motivo_perda)
      return setError('Perda exige um motivo estruturado.')
    // T3.01: ganho exige motivo estruturado (espelho da perda)
    if (form.estagio === 'fechado_ganho' && originalStage !== 'fechado_ganho' && !form.motivo_ganho)
      return setError('Ganho exige um motivo estruturado: por que o cliente fechou?')
    if (
      form.estagio === 'fechado_ganho' &&
      form.motivo_ganho === 'outro' &&
      !form.motivo_ganho_detalhe.trim()
    )
      return setError('Informe o detalhe do motivo de ganho.')
    if (
      form.estagio === 'fechado_perdido' &&
      form.motivo_perda === 'outro' &&
      !form.motivo_perda_detalhe.trim()
    )
      return setError('Informe o detalhe do motivo de perda.')
    if (
      (form.estagio === 'fechado_ganho' && form.status && form.status !== 'ganho') ||
      (form.estagio === 'fechado_perdido' && form.status && form.status !== 'perdido')
    )
      return setError('Status divergente da etapa final.')
    if (
      form.estagio !== 'fechado_ganho' &&
      form.estagio !== 'fechado_perdido' &&
      (form.status === 'ganho' || form.status === 'perdido')
    )
      return setError('Status "ganho"/"perdido" só valem em etapas finais.')
    if (form.estagio === 'fechado_perdido' && originalStage !== 'fechado_perdido') {
      if (!form.proxima_acao_descricao.trim())
        return setError(
          'Desqualificação exige a próxima ação: descreva o que acontece a partir daqui.',
        )
      if (!form.proxima_acao_em) return setError('Desqualificação exige a data da próxima ação.')
      if (new Date(form.proxima_acao_em + 'T23:59:59').getTime() < Date.now())
        return setError('A data da próxima ação deve ser futura.')
    }
    if (
      editing &&
      (originalStage === 'fechado_ganho' || originalStage === 'fechado_perdido') &&
      !form.estagio.startsWith('fechado_') &&
      !form.justificativa_reabertura.trim()
    )
      return setError('Reabertura exige uma justificativa.')
    try {
      const payload: Record<string, unknown> = {
        titulo: form.titulo,
        cliente: form.cliente,
        valor: value,
        estagio: form.estagio,
        probabilidade: probability,
        data_fechamento_previsto: form.data_fechamento_previsto || null,
        observacoes: form.observacoes,
        motivo_perda: form.motivo_perda || null,
        motivo_perda_detalhe: form.motivo_perda_detalhe,
        data_ganho: form.data_ganho || null,
        observacao_ganho: form.observacao_ganho,
        justificativa_reabertura: form.justificativa_reabertura,
        proxima_acao_em: form.proxima_acao_em || null,
        proxima_acao_descricao: form.proxima_acao_descricao,
        arquivado: form.arquivado === 'true',
        origem: form.origem || null,
        canal: form.canal || null,
        origem_especifica: form.origem_especifica,
        campanha: form.campanha,
        conteudo: form.conteudo,
        motivo_ganho: form.motivo_ganho || null,
        motivo_ganho_detalhe: form.motivo_ganho_detalhe,
        tags: form.tags,
        responsavel: form.responsavel || null,
        prioridade: form.prioridade || null,
        score: score ?? null,
        servico: form.servico || null,
        status: form.status || null,
      }
      if (editing) await pb.collection('negocios').update(editing, payload)
      else await pb.collection('negocios').create(payload)
      toast({ title: editing ? 'Oportunidade atualizada' : 'Oportunidade cadastrada' })
      reset()
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(
        response?.data?.message ||
          'Não foi possível salvar. Verifique os campos e tente novamente.',
      )
    }
  }
  const label = (options: { value: string; label: string }[], value?: string) =>
    options.find((option) => option.value === value)?.label || value || ''
  const [qualOpen, setQualOpen] = useState<Oportunidade | null>(null)
  const [diagOpen, setDiagOpen] = useState<Oportunidade | null>(null)
  const [c360Open, setC360Open] = useState<Oportunidade | null>(null)
  const [propOpen, setPropOpen] = useState<Oportunidade | null>(null)
  const [tarOpen, setTarOpen] = useState<Oportunidade | null>(null)
  const [formOpen, setFormOpen] = useState<Oportunidade | null>(null)
  const [fichaOpen, setFichaOpen] = useState<Oportunidade | null>(null)
  const [waOpen, setWaOpen] = useState<Oportunidade | null>(null)
  const [tlOpen, setTlOpen] = useState<Oportunidade | null>(null)
  const [emOpen, setEmOpen] = useState<Oportunidade | null>(null)
  const [comOpen, setComOpen] = useState<Oportunidade | null>(null)
  const [contratoOpen, setContratoOpen] = useState<Oportunidade | null>(null)
  const [contratoOpen, setContratoOpen] = useState<Oportunidade | null>(null)
  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={() => {
            setForm(emptyForm)
            setEditing(null)
            setOriginalStage('')
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Nova oportunidade
        </button>
      </header>
      <main className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Central Comercial
        </p>
        <h1 className="font-playfair text-4xl font-bold">Oportunidades</h1>
        <p className="text-[#6B7280] mt-2 mb-6">Registre e acompanhe as negociações comerciais.</p>
        <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 mb-5">
          <Search className="w-4 h-4 text-[#6B7280]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou contato"
            className="bg-transparent outline-none w-full"
          />
        </div>
        {error && !showForm && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando oportunidades...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-10 text-center">
            <p className="font-semibold text-lg">
              {search
                ? `Nenhuma oportunidade encontrada para "${search}"`
                : 'Nenhuma oportunidade ainda'}
            </p>
            <p className="text-sm text-[#6B7280] mt-1 mb-4">
              {search
                ? 'Tente outro termo ou limpe a busca.'
                : 'Registre a primeira oportunidade para ativar o pipeline comercial.'}
            </p>
            {!search && (
              <button
                onClick={() => {
                  setForm(emptyForm)
                  setEditing(null)
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 font-semibold text-sm"
              >
                <Plus className="w-4 h-4" /> Nova oportunidade
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#C9A227]/60 hover:shadow-md transition-all"
              >
                <div className="flex justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] shrink-0">
                      {(() => {
                        const Icone = servicoIcone[item.servico] || CircleDot
                        return <Icone className="w-5 h-5" />
                      })()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-playfair font-bold text-lg">{item.titulo}</h2>
                      <p className="text-sm text-[#6B7280]">
                        {item.cliente_nome || 'Contato não carregado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 px-2 py-1 h-fit font-semibold text-[#A8862B]">
                      {stages.find((stage) => stage.chave === item.estagio)?.nome || item.estagio}
                    </span>
                    {item.arquivado && (
                      <span className="text-xs rounded-full bg-neutral-200 px-2 py-1 h-fit">
                        Arquivada
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-4">
                  <span className="font-bold">
                    {item.valor == null
                      ? 'Valor não informado'
                      : `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </span>{' '}
                  <span className="text-[#6B7280]">
                    · Probabilidade: {item.probabilidade ?? 0}%
                  </span>
                </p>
                <p className="text-xs text-[#6B7280] mt-2">
                  Origem: {label(origemOptions, item.origem) || 'não informada'} · Prioridade:{' '}
                  {label(prioridadeOptions, item.prioridade) || 'não informada'} · Status:{' '}
                  {label(statusOptions, item.status) || 'não informado'} · Score:{' '}
                  {item.score ?? '—'}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Serviço: {label(servicoOptions, item.servico) || 'não informado'} · Responsável:{' '}
                  {item.responsavel_nome || 'não atribuído'} · Entrada:{' '}
                  {item.data_entrada
                    ? new Date(item.data_entrada).toLocaleDateString('pt-BR')
                    : '—'}
                  {item.tags ? ` · Tags: ${item.tags}` : ''}
                </p>
                <div className="flex gap-2 mt-4 items-center">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs flex items-center gap-1 border border-[#C9A227]/50 rounded-full px-3 py-1.5 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => setQualOpen(item)}
                    className="text-xs flex items-center gap-1 border border-[#C9A227]/50 rounded-full px-3 py-1.5 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] transition-colors"
                  >
                    Qualificar
                  </button>
                  <button
                    onClick={() => setDiagOpen(item)}
                    className="text-xs flex items-center gap-1 border border-[#C9A227]/50 rounded-full px-3 py-1.5 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] transition-colors"
                  >
                    Diagnóstico
                  </button>
                  <div className="relative ml-auto" data-menu-oportunidade>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setMenuAberto(menuAberto === item.id ? null : item.id)
                      }}
                      className="text-xs flex items-center gap-1 border border-[#C9A227]/50 rounded-full px-3 py-1.5 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] transition-colors"
                      aria-label="Mais ações"
                    >
                      Mais ⌄
                    </button>
                    {menuAberto === item.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setC360Open(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Consulta 360º
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setPropOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Proposta
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setTarOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Tarefas
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setFormOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Formulário
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setFichaOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Ficha da proposta
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setWaOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setTlOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Timeline
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setEmOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          E-mail
                        </button>
                        <button
                          onClick={() => {
                            setMenuAberto(null)
                            setComOpen(item)
                          }}
                          className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                        >
                          Comentários
                        </button>
                        {item.estagio === 'fechado_ganho' && (
                          <button
                            onClick={() => {
                              setMenuAberto(null)
                              setContratoOpen(item)
                            }}
                            className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1] font-semibold text-[#A8862B]"
                          >
                            Contrato
                          </button>
                        )}
                        {item.estagio === 'fechado_ganho' && (
                          <button
                            onClick={() => {
                              setMenuAberto(null)
                              setContratoOpen(item)
                            }}
                            className="block w-full text-left text-xs px-3 py-2 hover:bg-[#F7F5F1]"
                          >
                            Contrato
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-playfair text-2xl font-bold">
                {editing ? 'Editar oportunidade' : 'Nova oportunidade'}
              </h2>
              <button type="button" onClick={reset}>
                <X />
              </button>
            </div>
            {error && <p className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Título *
                <input
                  value={form.titulo}
                  onChange={(e) => update('titulo', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Contato *
                <select
                  value={form.cliente}
                  onChange={(e) => update('cliente', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => update('valor', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Probabilidade (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.probabilidade}
                  onChange={(e) => update('probabilidade', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Estágio
                <select
                  value={form.estagio}
                  onChange={(e) => update('estagio', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  {stages.map((stage) => (
                    <option key={stage.chave} value={stage.chave}>
                      {stage.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Fechamento previsto
                <input
                  type="date"
                  value={form.data_fechamento_previsto}
                  onChange={(e) => update('data_fechamento_previsto', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Origem
                <select
                  value={form.origem}
                  onChange={(e) => update('origem', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {origemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Canal (atribuição granular)
                <select
                  value={form.canal}
                  onChange={(e) => update('canal', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {canalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Origem específica
                <input
                  value={form.origem_especifica}
                  onChange={(e) => update('origem_especifica', e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: Instagram orgânico, indicação do contador X"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Campanha
                <input
                  value={form.campanha}
                  onChange={(e) => update('campanha', e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: CFO as a Service 2026"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Conteúdo
                <input
                  value={form.conteudo}
                  onChange={(e) => update('conteudo', e.target.value)}
                  maxLength={300}
                  placeholder="Ex.: post/reels/vídeo que gerou o contato"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Tags
                <input
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                  maxLength={500}
                  placeholder="Ex.: estratégico, renovação"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Responsável
                <select
                  value={form.responsavel}
                  onChange={(e) => update('responsavel', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Prioridade
                <select
                  value={form.prioridade}
                  onChange={(e) => update('prioridade', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {prioridadeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Score (0–100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.score}
                  onChange={(e) => update('score', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Serviço
                <select
                  value={form.servico}
                  onChange={(e) => update('servico', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {servicoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Data de entrada
                <input
                  type="date"
                  value={form.data_entrada}
                  disabled
                  className="mt-1 w-full border rounded-lg px-3 py-2 bg-[#F7F5F1] text-[#6B7280]"
                />
              </label>
              <label className="text-sm font-medium">
                Próxima ação (data)
                <input
                  type="date"
                  value={form.proxima_acao_em}
                  onChange={(e) => update('proxima_acao_em', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Próxima ação (descrição)
                <input
                  value={form.proxima_acao_descricao}
                  onChange={(e) => update('proxima_acao_descricao', e.target.value)}
                  maxLength={500}
                  placeholder="Ex.: enviar proposta revisada"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Arquivado
                <select
                  value={form.arquivado}
                  onChange={(e) => update('arquivado', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </label>
            </div>
            {form.estagio === 'fechado_perdido' && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <label className="text-sm font-medium">
                  Motivo da perda *
                  <select
                    value={form.motivo_perda}
                    onChange={(e) => update('motivo_perda', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione</option>
                    <option value="preco">Preço</option>
                    <option value="concorrencia">Concorrência</option>
                    <option value="sem_orcamento">Sem orçamento</option>
                    <option value="timing">Timing</option>
                    <option value="sem_retorno">Sem retorno</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                {form.motivo_perda === 'outro' && (
                  <label className="text-sm font-medium">
                    Detalhe do motivo *
                    <input
                      value={form.motivo_perda_detalhe}
                      onChange={(e) => update('motivo_perda_detalhe', e.target.value)}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                )}
              </div>
            )}
            {form.estagio === 'fechado_ganho' && (
              <>
                <label className="block text-sm font-medium mt-4">
                  Motivo do ganho <span className="text-red-600">*</span>
                  <select
                    value={form.motivo_ganho}
                    onChange={(e) => update('motivo_ganho', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione</option>
                    {motivoGanhoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.motivo_ganho === 'outro' && (
                  <label className="block text-sm font-medium mt-2">
                    Detalhe do motivo <span className="text-red-600">*</span>
                    <input
                      value={form.motivo_ganho_detalhe}
                      onChange={(e) => update('motivo_ganho_detalhe', e.target.value)}
                      maxLength={1000}
                      placeholder="Descreva o motivo específico"
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                )}
              </>
            )}
            {form.estagio === 'fechado_ganho' && (
              <label className="block text-sm font-medium mt-4">
                Observação do ganho
                <textarea
                  value={form.observacao_ganho}
                  onChange={(e) => update('observacao_ganho', e.target.value)}
                  maxLength={1000}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </label>
            )}
            {editing && (
              <label className="block text-sm font-medium mt-4">
                Justificativa de reabertura
                <textarea
                  value={form.justificativa_reabertura}
                  onChange={(e) => update('justificativa_reabertura', e.target.value)}
                  maxLength={1000}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Obrigatória ao reabrir uma oportunidade ganha ou perdida"
                />
              </label>
            )}
            <label className="block text-sm font-medium mt-4">
              Observações
              <textarea
                value={form.observacoes}
                onChange={(e) => update('observacoes', e.target.value)}
                maxLength={1000}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            </label>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={reset} className="border rounded-lg px-4 py-2">
                Cancelar
              </button>
              <button className="bg-[#C9A227] rounded-lg px-4 py-2 font-semibold">Salvar</button>
            </div>
          </form>
        </div>
      )}
      {qualOpen && <QualificacaoNegocio negocio={qualOpen} onClose={() => setQualOpen(null)} />}
      {diagOpen && <DiagnosticoNegocio negocio={diagOpen} onClose={() => setDiagOpen(null)} />}
      {c360Open && <Consulta360Negocio negocioId={c360Open.id} onClose={() => setC360Open(null)} />}
      {propOpen && <PropostaNegocio negocio={propOpen} onClose={() => setPropOpen(null)} />}
      {tarOpen && <TarefasNegocio negocio={tarOpen} onClose={() => setTarOpen(null)} />}
      {formOpen && <FormularioNegocio negocio={formOpen} onClose={() => setFormOpen(null)} />}
      {fichaOpen && <FichaPropostaNegocio negocio={fichaOpen} onClose={() => setFichaOpen(null)} />}
      {waOpen && <WhatsAppNegocio negocio={waOpen} onClose={() => setWaOpen(null)} />}
      {tlOpen && (
        <TimelineNegocio
          negocioId={tlOpen.id}
          titulo={tlOpen.titulo}
          onClose={() => setTlOpen(null)}
        />
      )}
      {emOpen && <EmailNegocio negocio={emOpen} onClose={() => setEmOpen(null)} />}
      {comOpen && <ComentariosNegocio negocio={comOpen} onClose={() => setComOpen(null)} />}
      {contratoOpen && (
        <ContratoNegocio negocio={contratoOpen} onClose={() => setContratoOpen(null)} />
      )}
    </div>
  )
}
