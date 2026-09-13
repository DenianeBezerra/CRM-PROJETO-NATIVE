import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  AlertCircle,
  User,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { LOGO_WHITE } from '@/assets/logo'

export type Cliente = {
  id: string
  nome: string
  empresa?: string
  empresa_nome?: string
  email?: string
  telefone?: string
  cidade?: string
  origem?: 'site' | 'indicacao' | 'redes_sociais' | 'evento' | 'outro' | ''
  observacoes?: string
  status?: 'ativo' | 'inativo' | 'prospect'
  created?: string
  updated?: string
}

export type Empresa = {
  id: string
  nome: string
  status?: string
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

interface FormState {
  nome: string
  empresa: string
  email: string
  telefone: string
  cidade: string
  origem: '' | 'site' | 'indicacao' | 'redes_sociais' | 'evento' | 'outro'
  status: 'ativo' | 'prospect' | 'inativo'
  observacoes: string
}

const emptyForm: FormState = {
  nome: '',
  empresa: '',
  email: '',
  telefone: '',
  cidade: '',
  origem: '',
  status: 'prospect',
  observacoes: '',
}

export default function Contacts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [items, setItems] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'prospect' | 'inativo'>(
    'todos',
  )

  // Modal formulário (novo / editar)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [globalFormError, setGlobalFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Criação rápida de empresa no modal
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [criandoEmpresa, setCriandoEmpresa] = useState(false)
  const [empresaInlineError, setEmpresaInlineError] = useState<string | null>(null)

  // Modal confirmação de exclusão
  const [deletingItem, setDeletingItem] = useState<Cliente | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [records, empresasList] = await Promise.all([
        pb.collection('clientes').getFullList<Cliente>({
          sort: '-created',
          expand: 'empresa',
        }),
        pb.collection('empresas').getFullList<Empresa>({
          sort: 'nome',
        }),
      ])

      const mapped: Cliente[] = records.map((item) => {
        const expanded = (item as Cliente & { expand?: { empresa?: Empresa } }).expand?.empresa
        return {
          ...item,
          empresa_nome: expanded?.nome || '',
        }
      })

      setItems(mapped)
      setEmpresas(empresasList)
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setLoadError(
        msg && msg !== 'An unexpected error occurred.'
          ? msg
          : 'Não foi possível carregar a lista de contatos. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Filtragem client-side em tempo real
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      // Filtro por status
      if (filtroStatus !== 'todos') {
        const itemStatus = item.status || 'prospect'
        if (itemStatus !== filtroStatus) return false
      }

      // Filtro de busca por nome, empresa, e-mail ou cidade
      if (!q) return true

      const matchNome = (item.nome || '').toLowerCase().includes(q)
      const matchEmpresa = (item.empresa_nome || '').toLowerCase().includes(q)
      const matchEmail = (item.email || '').toLowerCase().includes(q)
      const matchCidade = (item.cidade || '').toLowerCase().includes(q)

      return matchNome || matchEmpresa || matchEmail || matchCidade
    })
  }, [items, search, filtroStatus])

  // Contadores por status para os chips
  const contadores = useMemo(() => {
    const total = items.length
    const ativos = items.filter((x) => x.status === 'ativo').length
    const prospects = items.filter((x) => x.status === 'prospect').length
    const inativos = items.filter((x) => x.status === 'inativo').length
    return { total, ativos, prospects, inativos }
  }, [items])

  const openCreateModal = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setFormErrors({})
    setGlobalFormError(null)
    setNovaEmpresa('')
    setEmpresaInlineError(null)
    setShowModal(true)
  }

  const openEditModal = (item: Cliente) => {
    setEditingItem(item)
    setForm({
      nome: item.nome || '',
      empresa: item.empresa || '',
      email: item.email || '',
      telefone: item.telefone || '',
      cidade: item.cidade || '',
      origem: (item.origem as FormState['origem']) || '',
      status: item.status || 'prospect',
      observacoes: item.observacoes || '',
    })
    setFormErrors({})
    setGlobalFormError(null)
    setNovaEmpresa('')
    setEmpresaInlineError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormErrors({})
    setGlobalFormError(null)
    setEmpresaInlineError(null)
  }

  const handleFormChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Limpa erro do campo alterado
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
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
      // Verificar se já existe empresa com este nome
      const existente = empresas.find(
        (e) => e.nome.trim().toLowerCase() === nomeLimpo.toLowerCase(),
      )
      if (existente) {
        setForm((prev) => ({ ...prev, empresa: existente.id }))
        setNovaEmpresa('')
        toast({
          title: 'Empresa existente selecionada',
          description: `"${existente.nome}" foi vinculada ao contato.`,
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
      const msg = getErrorMessage(err)
      setEmpresaInlineError(msg || 'Erro ao cadastrar empresa. Tente novamente.')
    } finally {
      setCriandoEmpresa(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.nome.trim()) {
      errors.nome = 'O nome do contato é obrigatório.'
    } else if (form.nome.trim().length < 2) {
      errors.nome = 'O nome deve ter pelo menos 2 caracteres.'
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Informe um endereço de e-mail válido.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalFormError(null)

    if (!validateForm()) return

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

      if (editingItem) {
        await pb.collection('clientes').update(editingItem.id, payload)
        toast({
          title: 'Contato atualizado',
          description: `Os dados de "${form.nome.trim()}" foram salvos com sucesso.`,
        })
      } else {
        await pb.collection('clientes').create(payload)
        toast({
          title: 'Contato criado',
          description: `"${form.nome.trim()}" foi adicionado à base com sucesso.`,
        })
      }

      closeModal()
      await loadData()
    } catch (err: unknown) {
      // Extrair erros do PocketBase em nível de campo
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setFormErrors(fieldErrs)
      }

      const rawMsg = getErrorMessage(err)
      let amigavel = rawMsg
      if (rawMsg.includes('Failed to create') || rawMsg.includes('Failed to update')) {
        amigavel = 'Não foi possível salvar o contato. Verifique os campos destacados.'
      } else if (rawMsg.includes('email') || rawMsg.includes('valid email')) {
        amigavel = 'O e-mail informado é inválido ou já está cadastrado.'
      }

      setGlobalFormError(amigavel || 'Ocorreu um erro ao salvar o contato. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Abertura do modal de exclusão
  const promptDelete = (item: Cliente, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeletingItem(item)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await pb.collection('clientes').delete(deletingItem.id)
      toast({
        title: 'Contato excluído',
        description: `"${deletingItem.nome}" foi removido da base.`,
      })
      setDeletingItem(null)
      await loadData()
    } catch (err: unknown) {
      // Tratamento específico de erro de permissão (RBAC PocketBase: apenas admin pode excluir)
      const errObj = err as { status?: number; response?: { message?: string } }
      const status = errObj?.status || 0
      const message = errObj?.response?.message || ''

      if (
        status === 403 ||
        message.toLowerCase().includes('authorized') ||
        message.toLowerCase().includes('permission')
      ) {
        setDeleteError(
          'Apenas administradores do CRM Vibratto possuem permissão para excluir contatos permanentemente. Se necessário, altere o status para "Inativo".',
        )
      } else if (status === 404) {
        setDeleteError('Este contato não foi encontrado na base de dados.')
      } else {
        setDeleteError(
          getErrorMessage(err) || 'Não foi possível excluir o contato no momento. Tente novamente.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F1] text-[#0A0A0A] font-inter">
      {/* ========================================================= */}
      {/* TOP BAR PREMIUM (Identidade Vibratto)                     */}
      {/* ========================================================= */}
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
              Base de Contatos
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate('/home')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-all"
          >
            Home
          </button>
          <button
            onClick={() => navigate('/pipeline')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-all"
          >
            Pipeline
          </button>
          <button
            onClick={() => navigate('/contatos')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C9A227] text-[#0A0A0A] shadow-xs transition-all"
          >
            Contatos
          </button>
        </nav>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER                                            */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-5 border-b border-[#E5E7EB]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C9A227]/30 text-xs font-semibold text-[#A8862B] mb-2 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-[#C9A227]" />
              Gestão de Clientes & Relacionamento
            </div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-[#0A0A0A] tracking-tight">
              Contatos
            </h1>
            <p className="text-sm sm:text-base text-[#6B7280] mt-1 max-w-2xl">
              Gerencie contatos comerciais, empresas vinculadas, canais de origem e status de
              qualificação da base Vibratto.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] text-[#0A0A0A] px-4 py-2.5 font-semibold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo contato</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BARRA DE FILTROS & BUSCA                                  */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 sm:p-4 mb-6 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#A8862B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, empresa, e-mail ou cidade..."
              className="w-full bg-[#F7F5F1] border border-[#E5E7EB] focus:border-[#C9A227] focus:bg-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chips de Status & Contador */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E5E7EB]">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F7F5F1] border border-[#E5E7EB]">
              {(
                [
                  ['todos', 'Todos', contadores.total],
                  ['ativo', 'Ativos', contadores.ativos],
                  ['prospect', 'Prospects', contadores.prospects],
                  ['inativo', 'Inativos', contadores.inativos],
                ] as const
              ).map(([key, label, count]) => {
                const isActive = filtroStatus === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroStatus(key)}
                    className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 font-medium transition-all ${
                      isActive
                        ? 'bg-[#0A0A0A] text-white shadow-xs'
                        : 'text-[#6B7280] hover:text-[#0A0A0A] hover:bg-white/60'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive ? 'bg-[#C9A227] text-[#0A0A0A]' : 'bg-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Contador discreto de resultados filtrados */}
            <span className="text-xs text-[#6B7280] font-medium whitespace-nowrap px-1">
              {visibleItems.length === 1 ? '1 contato listado' : `${visibleItems.length} contatos`}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ESTADOS: LOADING / ERRO / VAZIO / CONTEÚDO                */}
        {/* ========================================================= */}

        {/* Estado de Erro no carregamento */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Falha ao comunicar com o servidor</p>
                <p className="text-xs text-red-700 mt-0.5">{loadError}</p>
              </div>
            </div>
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Estado de Carregamento (Skeleton elegante no padrão dourado) */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 shadow-xs">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 border-3 border-[#C9A227] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold text-[#0A0A0A]">Carregando contatos...</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Sincronizando com a base de dados do CRM Vibratto
              </p>
            </div>
          </div>
        ) : visibleItems.length === 0 ? (
          /* Estado de Lista Vazia */
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-10 text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 flex items-center justify-center mx-auto mb-4 text-[#C9A227]">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="font-playfair text-xl font-bold text-[#0A0A0A]">
              {search
                ? 'Nenhum contato encontrado'
                : filtroStatus !== 'todos'
                  ? `Nenhum contato com status "${STATUS_CONFIG[filtroStatus]?.label || filtroStatus}"`
                  : 'Nenhum contato cadastrado ainda'}
            </h3>
            <p className="text-sm text-[#6B7280] mt-1.5 max-w-md mx-auto">
              {search
                ? `Não encontramos nenhum cliente ou prospect correspondente ao termo "${search}". Tente outro filtro ou limpe a busca.`
                : 'Inicie adicionando seu primeiro contato para estruturar o relacionamento comercial e pipeline.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F5F1] text-xs font-semibold px-3 py-2 text-[#0A0A0A] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar busca</span>
                </button>
              )}
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] text-[#0A0A0A] text-xs font-semibold px-4 py-2 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo contato</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* LISTAGEM: TABELA (DESKTOP) E CARDS (MOBILE)               */
          /* ========================================================= */
          <div className="space-y-4">
            {/* 1. VISÃO DESKTOP (tabela elegante a partir de 768px/md) */}
            <div className="hidden md:block bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Empresa</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Cidade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-sm text-[#0A0A0A]">
                  {visibleItems.map((item) => {
                    const statusInfo =
                      STATUS_CONFIG[item.status || 'prospect'] || STATUS_CONFIG.prospect
                    const origemLabel = ORIGEM_CONFIG[item.origem || ''] || item.origem || '—'

                    return (
                      <tr
                        key={item.id}
                        onClick={() => openEditModal(item)}
                        className="hover:bg-[#FDFBF7] transition-colors cursor-pointer group"
                      >
                        {/* Nome */}
                        <td className="py-3.5 px-4 font-medium text-[#0A0A0A]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 flex items-center justify-center text-[#A8862B] text-xs font-bold shrink-0">
                              {item.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="group-hover:text-[#A8862B] transition-colors font-semibold">
                              {item.nome}
                            </span>
                          </div>
                        </td>

                        {/* Empresa */}
                        <td className="py-3.5 px-4 text-neutral-700">
                          {item.empresa_nome ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#0A0A0A] font-medium bg-[#F7F5F1] px-2 py-0.5 rounded border border-[#E5E7EB]">
                              <Building2 className="w-3 h-3 text-[#A8862B]" />
                              {item.empresa_nome}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>

                        {/* E-mail */}
                        <td className="py-3.5 px-4 text-xs text-neutral-600">
                          {item.email ? (
                            <span className="text-neutral-700 font-mono text-[13px]">
                              {item.email}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        {/* Telefone */}
                        <td className="py-3.5 px-4 text-xs text-neutral-600 whitespace-nowrap">
                          {item.telefone || <span className="text-neutral-400">—</span>}
                        </td>

                        {/* Cidade */}
                        <td className="py-3.5 px-4 text-xs text-neutral-700">
                          {item.cidade ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              {item.cidade}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        {/* Status (Badge colorido) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* Origem */}
                        <td className="py-3.5 px-4 text-xs text-neutral-600 whitespace-nowrap">
                          {origemLabel}
                        </td>

                        {/* Ações */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-md text-neutral-500 hover:text-[#0A0A0A] hover:bg-[#F0EDE6] transition-colors"
                              title="Editar contato"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => promptDelete(item, e)}
                              className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={
                                isAdmin ? 'Excluir contato' : 'Apenas administradores podem excluir'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. VISÃO MOBILE (Cards empilhados abaixo de 768px) */}
            <div className="md:hidden space-y-3">
              {visibleItems.map((item) => {
                const statusInfo =
                  STATUS_CONFIG[item.status || 'prospect'] || STATUS_CONFIG.prospect
                const origemLabel = ORIGEM_CONFIG[item.origem || ''] || item.origem

                return (
                  <article
                    key={item.id}
                    onClick={() => openEditModal(item)}
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#C9A227]/60 active:bg-[#FAF9F6] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 flex items-center justify-center text-[#A8862B] text-xs font-bold shrink-0">
                          {item.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="font-semibold text-base text-[#0A0A0A] leading-snug">
                            {item.nome}
                          </h2>
                          {item.empresa_nome && (
                            <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-[#A8862B]" />
                              {item.empresa_nome}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Dados de contato */}
                    <div className="mt-3 pt-2.5 border-t border-[#F0EFEB] space-y-1.5 text-xs text-[#6B7280]">
                      {item.email && (
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{item.email}</span>
                        </div>
                      )}
                      {item.telefone && (
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{item.telefone}</span>
                        </div>
                      )}
                      {item.cidade && (
                        <div className="flex items-center gap-2 text-neutral-700">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{item.cidade}</span>
                        </div>
                      )}
                      {origemLabel && (
                        <div className="text-[11px] text-[#A8862B] font-medium pt-1">
                          Origem: {origemLabel}
                        </div>
                      )}
                    </div>

                    {/* Ações no card mobile */}
                    <div
                      className="mt-3 pt-2.5 border-t border-[#F0EFEB] flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] hover:underline"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar contato</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => promptDelete(item, e)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO DE CONTATO                       */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl border border-[#C9A227]/40 shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0A0A0A] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#C9A227]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#C9A227]/40 flex items-center justify-center text-[#E8C766]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-playfair text-lg sm:text-xl font-bold tracking-tight text-white">
                    {editingItem ? 'Editar contato' : 'Novo contato'}
                  </h2>
                  <p className="text-[11px] text-[#E8C766]/80 font-inter">
                    {editingItem
                      ? 'Atualize as informações do cliente na base comercial'
                      : 'Cadastre um novo contato e vincule à empresa'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Formulário */}
            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Alerta de erro geral */}
              {globalFormError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{globalFormError}</span>
                </div>
              )}

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome (Obrigatório) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Nome completo <span className="text-[#C9A227]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                    placeholder="Ex.: Mariana Albuquerque"
                    className={`w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors ${
                      formErrors.nome
                        ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                        : 'border-[#E5E7EB] bg-white focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]'
                    }`}
                  />
                  {formErrors.nome && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.nome}</p>
                  )}
                </div>

                {/* Empresa (Select existente) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Empresa vinculada
                  </label>
                  <select
                    value={form.empresa}
                    onChange={(e) => handleFormChange('empresa', e.target.value)}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227] transition-colors"
                  >
                    <option value="">Nenhuma / Sem empresa</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Criar Empresa Inline (Auxiliar) */}
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
                      {criandoEmpresa ? 'Criando...' : '+ Criar'}
                    </button>
                  </div>
                  {empresaInlineError && (
                    <p className="text-[11px] text-red-600 mt-1">{empresaInlineError}</p>
                  )}
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className={`w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors ${
                      formErrors.email
                        ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                        : 'border-[#E5E7EB] bg-white focus:border-[#C9A227]'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.email}</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => handleFormChange('telefone', e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={(e) => handleFormChange('cidade', e.target.value)}
                    placeholder="Ex.: São Paulo / Florianópolis"
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                {/* Origem (Select) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Origem do lead
                  </label>
                  <select
                    value={form.origem}
                    onChange={(e) =>
                      handleFormChange('origem', e.target.value as FormState['origem'])
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

                {/* Status (Select) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleFormChange('status', e.target.value as FormState['status'])
                    }
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  >
                    <option value="prospect">Prospect (Lead qualificado / em contato)</option>
                    <option value="ativo">Ativo (Cliente com contrato ou proposta aceita)</option>
                    <option value="inativo">Inativo (Sem relacionamento ativo)</option>
                  </select>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Observações gerais
                  </label>
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Anotações comerciais, contexto da prospecção, histórico..."
                    maxLength={1000}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white p-3 outline-none focus:border-[#C9A227]"
                  />
                  <div className="text-[11px] text-[#6B7280] text-right mt-0.5">
                    {form.observacoes.length}/1000 caracteres
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-[#E5E7EB] hover:bg-[#F7F5F1] text-xs sm:text-sm font-semibold px-4 py-2 text-[#0A0A0A] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#C9A227] hover:bg-[#B8860B] disabled:opacity-50 text-[#0A0A0A] text-xs sm:text-sm font-semibold px-5 py-2 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Salvar alterações' : 'Cadastrar contato'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO COM CONTROLE RBAC          */}
      {/* ========================================================= */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl border border-red-200 shadow-2xl w-full max-w-md p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-playfair text-xl font-bold text-center text-[#0A0A0A]">
              Confirmar exclusão
            </h3>
            <p className="text-sm text-center text-[#6B7280] mt-2">
              Tem certeza de que deseja remover o contato{' '}
              <strong className="text-[#0A0A0A]">"{deletingItem.nome}"</strong>? Esta ação é
              irreversível e remove o histórico da base.
            </p>

            {deleteError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="w-full rounded-lg border border-[#E5E7EB] hover:bg-[#F7F5F1] text-sm font-semibold py-2.5 text-[#0A0A0A] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
