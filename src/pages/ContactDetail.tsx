import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Plus,
  Calendar,
  MessageSquare,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  X,
  Send,
  Video,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { LOGO_WHITE } from '@/assets/logo'
import type { Cliente, Empresa } from './Contacts'

type Interacao = {
  id: string
  cliente: string
  tipo: 'ligacao' | 'email' | 'reuniao' | 'whatsapp' | 'outro'
  resumo: string
  data?: string
  registrado_por?: string
  created?: string
  updated?: string
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  ativo: {
    label: 'Ativo',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  prospect: {
    label: 'Prospect',
    badgeClass:
      'bg-[#FBF8EE] text-[#8C6D15] border border-[#E8C766]/60 dark:bg-[#2A2310] dark:text-[#E8C766]',
    dotClass: 'bg-[#C9A227]',
  },
  inativo: {
    label: 'Inativo',
    badgeClass:
      'bg-neutral-100 text-neutral-600 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
    dotClass: 'bg-neutral-400',
  },
}

const ORIGEM_CONFIG: Record<string, string> = {
  site: 'Site institucional',
  indicacao: 'Indicação',
  redes_sociais: 'Redes sociais',
  evento: 'Evento / Feira',
  outro: 'Outro',
}

const TIPO_INTERACAO_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }
> = {
  ligacao: {
    label: 'Ligação',
    icon: Phone,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  email: {
    label: 'E-mail',
    icon: Mail,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  reuniao: {
    label: 'Reunião',
    icon: Video,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  outro: {
    label: 'Outro',
    icon: FileText,
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  },
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Formulário de nova interação
  const [novoTipo, setNovoTipo] = useState<'ligacao' | 'email' | 'reuniao' | 'whatsapp' | 'outro'>(
    'ligacao',
  )
  const [novoResumo, setNovoResumo] = useState('')
  const [novaData, setNovaData] = useState(() => new Date().toISOString().slice(0, 10))
  const [salvandoInteracao, setSalvandoInteracao] = useState(false)
  const [erroInteracao, setErroInteracao] = useState<string | null>(null)

  // Modal de edição do contato (reaproveitado de Contatos)
  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    cidade: '',
    origem: '' as Cliente['origem'],
    status: 'prospect' as 'ativo' | 'prospect' | 'inativo',
    observacoes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [globalFormError, setGlobalFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Criação inline de empresa no modal de edição
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [criandoEmpresa, setCriandoEmpresa] = useState(false)
  const [empresaInlineError, setEmpresaInlineError] = useState<string | null>(null)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [clienteRecord, interacoesList, empresasList] = await Promise.all([
        pb.collection('clientes').getOne<Cliente>(id, { expand: 'empresa' }),
        pb.collection('interacoes').getFullList<Interacao>({
          filter: `cliente = "${id}"`,
          sort: '-data,-created',
        }),
        pb.collection('empresas').getFullList<Empresa>({
          sort: 'nome',
        }),
      ])

      const expandedEmpresa = (clienteRecord as Cliente & { expand?: { empresa?: Empresa } }).expand
        ?.empresa
      setCliente({
        ...clienteRecord,
        empresa_nome: expandedEmpresa?.nome || '',
      })
      setInteracoes(interacoesList)
      setEmpresas(empresasList)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Não foi possível carregar os detalhes do contato.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [id])

  // Submissão de nova interação
  const handleRegistrarInteracao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return
    if (!novoResumo.trim()) {
      setErroInteracao('Por favor, informe um resumo ou descrição da interação.')
      return
    }

    setSalvandoInteracao(true)
    setErroInteracao(null)

    try {
      await pb.collection('interacoes').create({
        cliente: cliente.id,
        tipo: novoTipo,
        resumo: novoResumo.trim(),
        data: novaData ? `${novaData} 12:00:00.000Z` : new Date().toISOString(),
        registrado_por: user?.id || null,
      })

      toast({
        title: 'Interação registrada',
        description: 'O histórico do contato foi atualizado com sucesso.',
      })

      setNovoResumo('')
      setNovaData(new Date().toISOString().slice(0, 10))
      setNovoTipo('ligacao')

      // Recarrega apenas interações
      const updatedInteracoes = await pb.collection('interacoes').getFullList<Interacao>({
        filter: `cliente = "${cliente.id}"`,
        sort: '-data,-created',
      })
      setInteracoes(updatedInteracoes)
    } catch (err: unknown) {
      setErroInteracao(
        getErrorMessage(err) || 'Não foi possível registrar a interação. Tente novamente.',
      )
    } finally {
      setSalvandoInteracao(false)
    }
  }

  // Abertura do modal de edição
  const openEditModal = () => {
    if (!cliente) return
    setForm({
      nome: cliente.nome || '',
      empresa: cliente.empresa || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cidade: cliente.cidade || '',
      origem: cliente.origem || '',
      status: cliente.status || 'prospect',
      observacoes: cliente.observacoes || '',
    })
    setFormErrors({})
    setGlobalFormError(null)
    setNovaEmpresa('')
    setEmpresaInlineError(null)
    setShowEditModal(true)
  }

  const handleCriarEmpresaInline = async () => {
    const nomeLimpo = novaEmpresa.trim()
    if (!nomeLimpo || nomeLimpo.length < 2) {
      setEmpresaInlineError('Informe o nome da empresa com no mínimo 2 caracteres.')
      return
    }

    setEmpresaInlineError(null)
    setCriandoEmpresa(true)

    try {
      const existente = empresas.find(
        (e) => e.nome.trim().toLowerCase() === nomeLimpo.toLowerCase(),
      )
      if (existente) {
        setForm((prev) => ({ ...prev, empresa: existente.id }))
        setNovaEmpresa('')
        toast({
          title: 'Empresa vinculada',
          description: `"${existente.nome}" foi selecionada.`,
        })
        return
      }

      const criada = await pb.collection('empresas').create<Empresa>({
        nome: nomeLimpo,
        status: 'ativa',
        natureza_registro: 'cliente',
      })

      setEmpresas((prev) => [...prev, criada].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((prev) => ({ ...prev, empresa: criada.id }))
      setNovaEmpresa('')
      toast({
        title: 'Empresa criada com sucesso',
        description: `"${criada.nome}" foi cadastrada e vinculada.`,
      })
    } catch (err: unknown) {
      setEmpresaInlineError(getErrorMessage(err) || 'Erro ao cadastrar empresa.')
    } finally {
      setCriandoEmpresa(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return
    setGlobalFormError(null)

    if (!form.nome.trim()) {
      setFormErrors({ nome: 'O nome do contato é obrigatório.' })
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        empresa: form.empresa ? form.empresa : null,
        email: form.email.trim() ? form.email.trim() : null,
        telefone: form.telefone.trim() || '',
        cidade: form.cidade.trim() || '',
        origem: form.origem || null,
        status: form.status,
        observacoes: form.observacoes.trim() || '',
      }

      await pb.collection('clientes').update(cliente.id, payload)
      toast({
        title: 'Contato atualizado',
        description: `Os dados de "${form.nome.trim()}" foram salvos com sucesso.`,
      })
      setShowEditModal(false)
      await loadData()
    } catch (err: unknown) {
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setFormErrors(fieldErrs)
      }
      setGlobalFormError(getErrorMessage(err) || 'Erro ao atualizar o contato.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formatador de data amigável pt-BR
  const formatarDataPtBr = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso.replace(' ', 'T'))
      if (isNaN(d.getTime())) return iso
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F1] text-[#0A0A0A] font-inter">
      {/* Top Bar Vibratto */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_WHITE}
            alt="Vibratto BPO Financeiro"
            className="h-8 w-auto cursor-pointer"
            onClick={() => navigate('/home')}
          />
          <div className="h-6 w-[1px] bg-[#C9A227]/40" />
          <div className="flex flex-col">
            <span
              onClick={() => navigate('/home')}
              className="font-playfair text-lg sm:text-xl font-bold tracking-tight text-white cursor-pointer hover:text-[#E8C766] transition-colors"
            >
              Vibratto <span className="text-[#E8C766]">CRM</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#C9A227] font-semibold">
              Ficha do Contato
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => navigate('/contatos')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E8C766] border border-[#C9A227]/40 hover:bg-[#141414] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Contatos</span>
          </button>
        </nav>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center shadow-xs">
            <div className="w-10 h-10 border-3 border-[#C9A227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-[#0A0A0A]">Carregando dados do contato...</p>
            <p className="text-xs text-[#6B7280] mt-1">Buscando histórico e interações</p>
          </div>
        ) : error || !cliente ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="font-playfair text-xl font-bold text-[#0A0A0A]">
              Contato não encontrado
            </h2>
            <p className="text-sm text-[#6B7280] mt-1 max-w-md mx-auto">
              {error ||
                'O registro solicitado não existe ou você não possui permissão para visualizá-lo.'}
            </p>
            <button
              onClick={() => navigate('/contatos')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A0A0A] text-[#E8C766] text-xs font-semibold hover:bg-[#1f1f1f] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a lista</span>
            </button>
          </div>
        ) : (
          <>
            {/* Cabeçalho do Contato com Avatar Dourado e Ações */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E8C766] via-[#C9A227] to-[#A8862B]" />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-4 sm:gap-5">
                  {/* Avatar inicial dourado */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0A0A0A] border-2 border-[#C9A227] flex items-center justify-center text-[#E8C766] text-2xl sm:text-3xl font-playfair font-bold shadow-md shrink-0">
                    {cliente.nome.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[#0A0A0A]">
                        {cliente.nome}
                      </h1>

                      {/* Badges de Status e Origem */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          STATUS_CONFIG[cliente.status || 'prospect']?.badgeClass ||
                          STATUS_CONFIG.prospect.badgeClass
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            STATUS_CONFIG[cliente.status || 'prospect']?.dotClass ||
                            STATUS_CONFIG.prospect.dotClass
                          }`}
                        />
                        {STATUS_CONFIG[cliente.status || 'prospect']?.label || 'Prospect'}
                      </span>

                      {cliente.origem && (
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F7F5F1] text-[#A8862B] border border-[#C9A227]/40">
                          Origem: {ORIGEM_CONFIG[cliente.origem] || cliente.origem}
                        </span>
                      )}
                    </div>

                    {cliente.empresa_nome && (
                      <div className="flex items-center gap-2 text-sm text-[#0A0A0A] font-medium">
                        <Building2 className="w-4 h-4 text-[#C9A227]" />
                        <span>{cliente.empresa_nome}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#6B7280] pt-1">
                      {cliente.email && (
                        <a
                          href={`mailto:${cliente.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-[#A8862B] transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span className="font-mono text-neutral-800">{cliente.email}</span>
                        </a>
                      )}
                      {cliente.telefone && (
                        <a
                          href={`tel:${cliente.telefone}`}
                          className="inline-flex items-center gap-1.5 hover:text-[#A8862B] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span>{cliente.telefone}</span>
                        </a>
                      )}
                      {cliente.cidade && (
                        <span className="inline-flex items-center gap-1.5 text-neutral-600">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span>{cliente.cidade}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Cabeçalho */}
                <div className="flex flex-wrap md:flex-col lg:flex-row items-stretch md:items-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E7EB]">
                  <button
                    onClick={openEditModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F5F1] text-xs font-semibold text-[#0A0A0A] transition-colors shadow-2xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => navigate(`/pipeline?novo=1&cliente=${cliente.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] text-[#0A0A0A] text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Novo negócio para este cliente</span>
                  </button>

                  <button
                    onClick={() => navigate('/contatos')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>
                </div>
              </div>

              {cliente.observacoes && (
                <div className="mt-5 pt-4 border-t border-[#F0EFEB] text-xs text-[#6B7280] bg-[#FAF9F6] p-3 rounded-lg">
                  <span className="font-semibold text-[#0A0A0A]">Observações: </span>
                  {cliente.observacoes}
                </div>
              )}
            </div>

            {/* Grid 2 Colunas: Formulário de Nova Interação + Histórico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1: Formulário de Registro de Interação (1/3) */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs sticky top-20">
                  <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E5E7EB]">
                    <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-playfair text-base font-bold text-[#0A0A0A]">
                        Nova Interação
                      </h2>
                      <p className="text-[11px] text-[#6B7280]">
                        Registre uma reunião, ligação ou e-mail
                      </p>
                    </div>
                  </div>

                  {erroInteracao && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{erroInteracao}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegistrarInteracao} className="space-y-3.5 text-xs">
                    {/* Tipo de Interação */}
                    <div>
                      <label className="block font-semibold text-[#0A0A0A] mb-1">
                        Tipo de contato
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['ligacao', 'email', 'reuniao', 'whatsapp', 'outro'] as const).map(
                          (t) => {
                            const conf = TIPO_INTERACAO_CONFIG[t]
                            const Icon = conf.icon
                            const isSelected = novoTipo === t
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNovoTipo(t)}
                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                                  isSelected
                                    ? 'bg-[#0A0A0A] text-[#E8C766] border-[#C9A227] font-semibold'
                                    : 'bg-white text-neutral-700 border-[#E5E7EB] hover:border-[#C9A227]/60'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{conf.label}</span>
                              </button>
                            )
                          },
                        )}
                      </div>
                    </div>

                    {/* Data */}
                    <div>
                      <label className="block font-semibold text-[#0A0A0A] mb-1">
                        Data da interação
                      </label>
                      <input
                        type="date"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#C9A227]"
                      />
                    </div>

                    {/* Resumo */}
                    <div>
                      <label className="block font-semibold text-[#0A0A0A] mb-1">
                        Resumo / Notas da interação <span className="text-[#C9A227]">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={novoResumo}
                        onChange={(e) => setNovoResumo(e.target.value)}
                        placeholder="Descreva o que foi tratado, alinhamentos ou próximos passos..."
                        className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-xs bg-white outline-none focus:border-[#C9A227]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={salvandoInteracao || !novoResumo.trim()}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] disabled:opacity-50 text-[#0A0A0A] py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      {salvandoInteracao ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Registrar no histórico</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Coluna 2: Histórico de Interações (2/3) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-playfair text-lg font-bold text-[#0A0A0A]">
                          Histórico de Interações
                        </h2>
                        <p className="text-xs text-[#6B7280]">
                          Linha do tempo de pontos de contato com este cliente
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7F5F1] text-[#A8862B] border border-[#C9A227]/30">
                      {interacoes.length} {interacoes.length === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  {interacoes.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 flex items-center justify-center mx-auto mb-3 text-[#C9A227]">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h3 className="font-playfair text-base font-bold text-[#0A0A0A]">
                        Nenhuma interação registrada ainda
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                        Use o formulário ao lado para registrar o primeiro telefonema, reunião ou
                        mensagem trocada com este contato.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#E5E7EB]">
                      {interacoes.map((item) => {
                        const conf = TIPO_INTERACAO_CONFIG[item.tipo] || TIPO_INTERACAO_CONFIG.outro
                        const Icon = conf.icon
                        return (
                          <div key={item.id} className="relative group">
                            {/* Marcador na linha do tempo */}
                            <div className="absolute -left-[27px] top-1.5 w-6 h-6 rounded-full bg-[#0A0A0A] border-2 border-[#C9A227] flex items-center justify-center text-[#E8C766] shadow-xs">
                              <Icon className="w-3 h-3" />
                            </div>

                            {/* Conteúdo do Registro */}
                            <div className="bg-[#FAF9F6] border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 transition-all">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${conf.badgeClass}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {conf.label}
                                </span>

                                <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-[#A8862B]" />
                                  {formatarDataPtBr(item.data || item.created)}
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm text-[#0A0A0A] leading-relaxed whitespace-pre-wrap">
                                {item.resumo}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal de Edição de Contato (reaproveitado de Contatos) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl border border-[#C9A227]/40 shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0A0A0A] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#C9A227]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#C9A227]/40 flex items-center justify-center text-[#E8C766]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-playfair text-lg font-bold text-white">Editar contato</h2>
                  <p className="text-[11px] text-[#E8C766]/80 font-inter">
                    Atualize os dados cadastrais do cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4">
              {globalFormError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{globalFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Nome completo <span className="text-[#C9A227]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                  {formErrors.nome && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Empresa vinculada
                  </label>
                  <select
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  >
                    <option value="">Nenhuma / Sem empresa</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] mb-1">
                    Ou cadastrar nova empresa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaEmpresa}
                      onChange={(e) => setNovaEmpresa(e.target.value)}
                      placeholder="Nome da empresa..."
                      className="w-full text-sm rounded-lg border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#C9A227]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCriarEmpresaInline()}
                      disabled={criandoEmpresa || !novaEmpresa.trim()}
                      className="shrink-0 rounded-lg bg-[#0A0A0A] hover:bg-[#1f1f1f] disabled:opacity-40 text-[#E8C766] px-3 py-2 text-xs font-semibold transition-colors"
                    >
                      {criandoEmpresa ? '...' : '+ Criar'}
                    </button>
                  </div>
                  {empresaInlineError && (
                    <p className="text-[11px] text-red-600 mt-1">{empresaInlineError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Origem do lead
                  </label>
                  <select
                    value={form.origem}
                    onChange={(e) =>
                      setForm({ ...form, origem: e.target.value as Cliente['origem'] })
                    }
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  >
                    <option value="">Selecione a origem</option>
                    <option value="site">Site institucional</option>
                    <option value="indicacao">Indicação</option>
                    <option value="redes_sociais">Redes sociais</option>
                    <option value="evento">Evento / Feira</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as 'ativo' | 'prospect' | 'inativo',
                      })
                    }
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Observações gerais
                  </label>
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white p-3 outline-none focus:border-[#C9A227]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-[#E5E7EB] hover:bg-[#F7F5F1] text-xs font-semibold px-4 py-2 text-[#0A0A0A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#C9A227] hover:bg-[#B8860B] disabled:opacity-50 text-[#0A0A0A] text-xs font-semibold px-5 py-2 transition-all shadow-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
