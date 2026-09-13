import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { LOGO_WHITE } from '@/assets/logo'

export type EstagioChave =
  | 'novo'
  | 'contato_feito'
  | 'proposta'
  | 'fechado_ganho'
  | 'fechado_perdido'

export interface EstagioConfig {
  chave: EstagioChave
  titulo: string
  corBorda: string
  corFundoHeader: string
  badgeClass: string
  destaque?: 'ganho' | 'perdido' | 'normal'
}

export const ESTAGIOS: EstagioConfig[] = [
  {
    chave: 'novo',
    titulo: 'Novo',
    corBorda: 'border-[#E5E7EB]',
    corFundoHeader: 'bg-white',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    destaque: 'normal',
  },
  {
    chave: 'contato_feito',
    titulo: 'Contato feito',
    corBorda: 'border-[#E5E7EB]',
    corFundoHeader: 'bg-white',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    destaque: 'normal',
  },
  {
    chave: 'proposta',
    titulo: 'Proposta',
    corBorda: 'border-[#E5E7EB]',
    corFundoHeader: 'bg-white',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    destaque: 'normal',
  },
  {
    chave: 'fechado_ganho',
    titulo: 'Fechado (ganho)',
    corBorda: 'border-emerald-200/80',
    corFundoHeader: 'bg-emerald-50/40',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    destaque: 'ganho',
  },
  {
    chave: 'fechado_perdido',
    titulo: 'Fechado (perdido)',
    corBorda: 'border-rose-200/80',
    corFundoHeader: 'bg-rose-50/30',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    destaque: 'perdido',
  },
]

export interface ClienteItem {
  id: string
  nome: string
  empresa_nome?: string
  status?: string
}

export interface NegocioItem {
  id: string
  titulo: string
  cliente: string
  cliente_nome?: string
  valor?: number
  estagio: EstagioChave
  probabilidade?: number
  data_fechamento_previsto?: string
  observacoes?: string
  origem?: string
  status?: string
  created?: string
  updated?: string
}

interface FormState {
  titulo: string
  cliente: string
  valor: string
  estagio: EstagioChave
  probabilidade: number
  data_fechamento_previsto: string
  observacoes: string
}

const emptyForm: FormState = {
  titulo: '',
  cliente: '',
  valor: '',
  estagio: 'novo',
  probabilidade: 20,
  data_fechamento_previsto: '',
  observacoes: '',
}

export function formatarMoeda(valor?: number | null): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatarDataPtBr(dataStr?: string | null): string {
  if (!dataStr) return ''
  try {
    const limpa = dataStr.split('T')[0].split(' ')[0]
    const partes = limpa.split('-')
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    return limpa
  } catch {
    return dataStr
  }
}

export default function Pipeline() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [negocios, setNegocios] = useState<NegocioItem[]>([])
  const [clientes, setClientes] = useState<ClienteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState<string>('')

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<EstagioChave | null>(null)

  // Modal Novo / Edição
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<NegocioItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [globalFormError, setGlobalFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Criação rápida de cliente inline
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [clienteInlineError, setClienteInlineError] = useState<string | null>(null)

  // Modal Confirmação de exclusão
  const [deletingItem, setDeletingItem] = useState<NegocioItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [records, clientesList] = await Promise.all([
        pb.collection('negocios').getFullList<NegocioItem>({
          sort: '-created',
          expand: 'cliente',
        }),
        pb.collection('clientes').getFullList<ClienteItem>({
          sort: 'nome',
        }),
      ])

      const clienteMap = new Map<string, string>()
      clientesList.forEach((c) => {
        clienteMap.set(c.id, c.nome)
      })

      const mapped: NegocioItem[] = records.map((item) => {
        const expandedCliente = (
          item as NegocioItem & { expand?: { cliente?: { id: string; nome: string } } }
        ).expand?.cliente
        return {
          ...item,
          cliente_nome:
            expandedCliente?.nome || clienteMap.get(item.cliente) || 'Cliente não identificado',
          estagio: (item.estagio as EstagioChave) || 'novo',
        }
      })

      setNegocios(mapped)
      setClientes(clientesList)
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setLoadError(
        msg && msg !== 'An unexpected error occurred.'
          ? msg
          : 'Não foi possível carregar os negócios do pipeline. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Parâmetros de navegação externa (ex: /pipeline?novo=1&cliente=<id>)
  useEffect(() => {
    const novoParam = searchParams.get('novo')
    const clienteParam = searchParams.get('cliente')
    if (novoParam === '1') {
      setEditingItem(null)
      setForm({
        ...emptyForm,
        cliente: clienteParam || '',
        estagio: 'novo',
      })
      setFormErrors({})
      setGlobalFormError(null)
      setNovoClienteNome('')
      setClienteInlineError(null)
      setShowModal(true)
      // Limpa os parâmetros da URL sem recarregar
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('novo')
      newParams.delete('cliente')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Filtragem
  const visibleNegocios = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return negocios.filter((item) => {
      if (filtroCliente && item.cliente !== filtroCliente) {
        return false
      }
      if (!q) return true
      const matchTitulo = (item.titulo || '').toLowerCase().includes(q)
      const matchCliente = (item.cliente_nome || '').toLowerCase().includes(q)
      return matchTitulo || matchCliente
    })
  }, [negocios, busca, filtroCliente])

  // Métricas do topo
  const metricasResumo = useMemo(() => {
    const emAbertoEstagios: EstagioChave[] = ['novo', 'contato_feito', 'proposta']

    let totalEmAbertoValor = 0
    let totalEmAbertoQtd = 0
    let totalGanhoValor = 0
    let totalGanhoQtd = 0

    negocios.forEach((item) => {
      const val = Number(item.valor) || 0
      if (emAbertoEstagios.includes(item.estagio)) {
        totalEmAbertoValor += val
        totalEmAbertoQtd += 1
      } else if (item.estagio === 'fechado_ganho') {
        totalGanhoValor += val
        totalGanhoQtd += 1
      }
    })

    return {
      totalEmAbertoValor,
      totalEmAbertoQtd,
      totalGanhoValor,
      totalGanhoQtd,
    }
  }, [negocios])

  // Colunas calculadas com itens e somas
  const colunasData = useMemo(() => {
    return ESTAGIOS.map((estagio) => {
      const itens = visibleNegocios.filter((n) => n.estagio === estagio.chave)
      const somaValor = itens.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)
      return {
        ...estagio,
        itens,
        quantidade: itens.length,
        somaValor,
      }
    })
  }, [visibleNegocios])

  // Mover negócio entre estágios (atualização otimista + rollback)
  const moverEstagio = async (negocioId: string, novoEstagio: EstagioChave) => {
    const itemAtual = negocios.find((n) => n.id === negocioId)
    if (!itemAtual || itemAtual.estagio === novoEstagio) return

    const estagioAnterior = itemAtual.estagio

    // Atualização otimista
    setNegocios((prev) =>
      prev.map((n) => (n.id === negocioId ? { ...n, estagio: novoEstagio } : n)),
    )

    try {
      const payload: Record<string, unknown> = {
        estagio: novoEstagio,
      }
      if (novoEstagio === 'fechado_ganho') {
        payload.status = 'ganho'
        if (!itemAtual.probabilidade || itemAtual.probabilidade < 100) {
          payload.probabilidade = 100
        }
      } else if (novoEstagio === 'fechado_perdido') {
        payload.status = 'perdido'
      } else {
        payload.status = 'em_negociacao'
      }

      await pb.collection('negocios').update(negocioId, payload)

      const estagioDestinoNome =
        ESTAGIOS.find((e) => e.chave === novoEstagio)?.titulo || novoEstagio
      toast({
        title: 'Estágio atualizado',
        description: `"${itemAtual.titulo}" movido para "${estagioDestinoNome}".`,
      })
    } catch (err: unknown) {
      // Rollback
      setNegocios((prev) =>
        prev.map((n) => (n.id === negocioId ? { ...n, estagio: estagioAnterior } : n)),
      )
      const msg = getErrorMessage(err)
      toast({
        title: 'Falha ao mover negócio',
        description:
          msg && msg !== 'An unexpected error occurred.'
            ? msg
            : 'Não foi possível alterar o estágio. A posição original foi restaurada.',
        variant: 'destructive',
      })
    }
  }

  // Avançar / Recuar estágio via botão (mobile e acessibilidade)
  const avancarEstagio = (item: NegocioItem, direcao: 'avancar' | 'voltar') => {
    const ordemChaves: EstagioChave[] = [
      'novo',
      'contato_feito',
      'proposta',
      'fechado_ganho',
      'fechado_perdido',
    ]
    const idxAtual = ordemChaves.indexOf(item.estagio)
    if (idxAtual === -1) return

    if (direcao === 'avancar' && idxAtual < ordemChaves.length - 1) {
      void moverEstagio(item.id, ordemChaves[idxAtual + 1])
    } else if (direcao === 'voltar' && idxAtual > 0) {
      void moverEstagio(item.id, ordemChaves[idxAtual - 1])
    }
  }

  // Handlers Drag and Drop nativo
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, estagio: EstagioChave) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== estagio) {
      setDragOverCol(estagio)
    }
  }

  const handleDragLeave = (e: React.DragEvent, estagio: EstagioChave) => {
    if (dragOverCol === estagio) {
      setDragOverCol(null)
    }
  }

  const handleDrop = (e: React.DragEvent, estagio: EstagioChave) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('text/plain') || draggedId
    if (id) {
      void moverEstagio(id, estagio)
    }
    setDraggedId(null)
  }

  // Modais de Criação e Edição
  const openCreateModal = (estagioInicial: EstagioChave = 'novo') => {
    setEditingItem(null)
    setForm({
      ...emptyForm,
      estagio: estagioInicial,
    })
    setFormErrors({})
    setGlobalFormError(null)
    setNovoClienteNome('')
    setClienteInlineError(null)
    setShowModal(true)
  }

  const openEditModal = (item: NegocioItem) => {
    setEditingItem(item)
    setForm({
      titulo: item.titulo || '',
      cliente: item.cliente || '',
      valor: item.valor != null ? String(item.valor) : '',
      estagio: item.estagio || 'novo',
      probabilidade: item.probabilidade ?? 20,
      data_fechamento_previsto: item.data_fechamento_previsto
        ? item.data_fechamento_previsto.split('T')[0].split(' ')[0]
        : '',
      observacoes: item.observacoes || '',
    })
    setFormErrors({})
    setGlobalFormError(null)
    setNovoClienteNome('')
    setClienteInlineError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormErrors({})
    setGlobalFormError(null)
    setClienteInlineError(null)
  }

  const handleFormChange = (key: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // Criar cliente inline no modal
  const handleCriarClienteInline = async () => {
    const nomeLimpo = novoClienteNome.trim()
    if (!nomeLimpo || nomeLimpo.length < 2) {
      setClienteInlineError('Informe o nome do contato com no mínimo 2 caracteres.')
      return
    }

    setClienteInlineError(null)
    setCriandoCliente(true)

    try {
      const existente = clientes.find(
        (c) => c.nome.trim().toLowerCase() === nomeLimpo.toLowerCase(),
      )
      if (existente) {
        setForm((prev) => ({ ...prev, cliente: existente.id }))
        setNovoClienteNome('')
        toast({
          title: 'Contato já cadastrado',
          description: `"${existente.nome}" foi selecionado para este negócio.`,
        })
        return
      }

      const criado = await pb.collection('clientes').create<ClienteItem>({
        nome: nomeLimpo,
        status: 'prospect',
      })

      setClientes((prev) => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((prev) => ({ ...prev, cliente: criado.id }))
      setNovoClienteNome('')
      toast({
        title: 'Contato cadastrado com sucesso',
        description: `"${criado.nome}" foi adicionado e vinculado.`,
      })
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setClienteInlineError(msg || 'Erro ao cadastrar contato. Tente novamente.')
    } finally {
      setCriandoCliente(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.titulo.trim()) {
      errors.titulo = 'O título do negócio é obrigatório.'
    } else if (form.titulo.trim().length < 3) {
      errors.titulo = 'O título deve ter pelo menos 3 caracteres.'
    }

    if (!form.cliente) {
      errors.cliente = 'Selecione um cliente para vincular ao negócio.'
    }

    if (form.valor) {
      const numVal = parseFloat(form.valor.replace(',', '.'))
      if (isNaN(numVal) || numVal < 0) {
        errors.valor = 'Informe um valor monetário válido (ex: 5000).'
      }
    }

    if (form.probabilidade < 0 || form.probabilidade > 100) {
      errors.probabilidade = 'A probabilidade deve estar entre 0% e 100%.'
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
      const numValor = form.valor ? parseFloat(form.valor.replace(',', '.')) : 0
      const payload: Record<string, unknown> = {
        titulo: form.titulo.trim(),
        cliente: form.cliente,
        valor: numValor,
        estagio: form.estagio,
        probabilidade: Number(form.probabilidade) || 0,
        observacoes: form.observacoes.trim(),
      }

      if (form.data_fechamento_previsto) {
        payload.data_fechamento_previsto = new Date(
          `${form.data_fechamento_previsto}T12:00:00.000Z`,
        ).toISOString()
      } else {
        payload.data_fechamento_previsto = null
      }

      if (form.estagio === 'fechado_ganho') {
        payload.status = 'ganho'
      } else if (form.estagio === 'fechado_perdido') {
        payload.status = 'perdido'
      } else {
        payload.status = 'em_negociacao'
      }

      if (editingItem) {
        await pb.collection('negocios').update(editingItem.id, payload)
        toast({
          title: 'Negócio atualizado',
          description: `"${form.titulo.trim()}" foi atualizado com sucesso.`,
        })
      } else {
        await pb.collection('negocios').create(payload)
        toast({
          title: 'Negócio criado',
          description: `"${form.titulo.trim()}" foi adicionado ao pipeline.`,
        })
      }

      closeModal()
      await loadData()
    } catch (err: unknown) {
      const fieldErrs = extractFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setFormErrors(fieldErrs)
      }

      const rawMsg = getErrorMessage(err)
      let amigavel = rawMsg
      if (rawMsg.includes('Failed to create') || rawMsg.includes('Failed to update')) {
        amigavel = 'Não foi possível salvar o negócio. Revise os campos obrigatórios.'
      }

      setGlobalFormError(amigavel || 'Ocorreu um erro ao salvar o negócio. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Exclusão
  const promptDelete = (item: NegocioItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeletingItem(item)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await pb.collection('negocios').delete(deletingItem.id)
      toast({
        title: 'Negócio excluído',
        description: `"${deletingItem.titulo}" foi removido do pipeline.`,
      })
      setDeletingItem(null)
      await loadData()
    } catch (err: unknown) {
      const errObj = err as { status?: number; response?: { message?: string } }
      const status = errObj?.status || 0
      const message = errObj?.response?.message || ''

      if (
        status === 403 ||
        message.toLowerCase().includes('authorized') ||
        message.toLowerCase().includes('permission')
      ) {
        setDeleteError(
          'Apenas administradores do CRM Vibratto possuem permissão para excluir negócios permanentemente. Caso o negócio não tenha prosperado, mova o estágio para "Fechado (perdido)".',
        )
      } else if (status === 404) {
        setDeleteError('Este negócio não foi encontrado na base de dados.')
      } else {
        setDeleteError(
          getErrorMessage(err) || 'Não foi possível excluir o negócio no momento. Tente novamente.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F1] text-[#0A0A0A] font-inter">
      {/* ========================================================= */}
      {/* TOP BAR COM IDENTIDADE VIBRATTO & NAVEGAÇÃO CONSISTENTE  */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        {/* Lado Esquerdo: Marca Vibratto */}
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
              Pipeline de Negócios
            </span>
          </div>
        </div>

        {/* Centro/Direita: Navegação consistente com destaque ativo */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate('/home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname === '/home'
                ? 'bg-[#C9A227] text-[#0A0A0A] font-semibold shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/pipeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname === '/pipeline'
                ? 'bg-[#C9A227] text-[#0A0A0A] font-semibold shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => navigate('/contatos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname === '/contatos'
                ? 'bg-[#C9A227] text-[#0A0A0A] font-semibold shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Contatos
          </button>
        </nav>
      </header>

      {/* ========================================================= */}
      {/* CORPO PRINCIPAL                                           */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Cabeçalho da Tela com Ações */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-5 border-b border-[#E5E7EB]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C9A227]/30 text-xs font-semibold text-[#A8862B] mb-2 shadow-xs">
              <TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" />
              Gestão de Oportunidades Comerciais
            </div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-[#0A0A0A] tracking-tight">
              Pipeline de Negócios
            </h1>
            <p className="text-sm sm:text-base text-[#6B7280] mt-1 max-w-2xl">
              Acompanhe negócios nos estágios de funil, arraste cards para atualizar o status e
              feche contratos com clareza financeira.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => openCreateModal('novo')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] text-[#0A0A0A] px-4 py-2.5 font-semibold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo negócio</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARDS DISCRETOS DE MÉTRICAS RESUMO (PADRÃO HOME)          */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total em aberto */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Total em Aberto
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FAF9F6] border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-playfair text-2xl font-bold text-[#0A0A0A]">
                {formatarMoeda(metricasResumo.totalEmAbertoValor)}
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">
              {metricasResumo.totalEmAbertoQtd} oportunidade
              {metricasResumo.totalEmAbertoQtd === 1 ? '' : 's'} (Novo, Contato feito e Proposta)
            </p>
          </div>

          {/* Card 2: Valor Total Ganho */}
          <div className="bg-white rounded-xl border border-emerald-200/80 p-4 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Valor Total Ganho
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100/70 border border-emerald-300 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-playfair text-2xl font-bold text-emerald-950">
                {formatarMoeda(metricasResumo.totalGanhoValor)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-1">
              {metricasResumo.totalGanhoQtd} contrato
              {metricasResumo.totalGanhoQtd === 1 ? '' : 's'} conquistado
              {metricasResumo.totalGanhoQtd === 1 ? '' : 's'}
            </p>
          </div>

          {/* Card 3: Total Geral de Oportunidades */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Total de Negócios
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FAF9F6] border border-[#E5E7EB] flex items-center justify-center text-[#0A0A0A]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-playfair text-2xl font-bold text-[#0A0A0A]">
                {negocios.length}
              </span>
              <span className="text-xs text-[#6B7280]">registros</span>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">Volume total no funil da base</p>
          </div>

          {/* Card 4: Clientes na Carteira */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Clientes Vinculados
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FAF9F6] border border-[#E5E7EB] flex items-center justify-center text-[#A8862B]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-playfair text-2xl font-bold text-[#0A0A0A]">
                {clientes.length}
              </span>
              <span className="text-xs text-[#6B7280]">cadastrados</span>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Contatos disponíveis para novos negócios
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BARRA DE FILTROS & BUSCA EM TEMPO REAL                    */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 sm:p-4 mb-6 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#A8862B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título do negócio ou cliente..."
              className="w-full bg-[#F7F5F1] border border-[#E5E7EB] focus:border-[#C9A227] focus:bg-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none transition-colors"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Cliente */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-400 hidden sm:block" />
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="bg-[#F7F5F1] border border-[#E5E7EB] focus:border-[#C9A227] text-xs sm:text-sm rounded-lg px-3 py-2 outline-none"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            {(busca || filtroCliente) && (
              <button
                onClick={() => {
                  setBusca('')
                  setFiltroCliente('')
                }}
                className="px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F7F5F1] text-xs font-semibold text-neutral-600 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* ESTADOS DE CARREGAMENTO / ERRO / VAZIO                    */}
        {/* ========================================================= */}

        {/* Banner de Erro */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Falha ao carregar pipeline</p>
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

        {/* Spinner elegante com cor dourada */}
        {loading ? (
          <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] p-12 shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-[#C9A227] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#0A0A0A]">Carregando pipeline...</p>
            <p className="text-xs text-[#6B7280] mt-1">
              Sincronizando negócios e estágios com o CRM Vibratto
            </p>
          </div>
        ) : negocios.length === 0 ? (
          /* Estado Vazio Global */
          <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] p-10 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 flex items-center justify-center mb-4 text-[#C9A227]">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="font-playfair text-xl font-bold text-[#0A0A0A]">
              Nenhum negócio no pipeline
            </h3>
            <p className="text-sm text-[#6B7280] mt-1.5 max-w-md mx-auto">
              Seu funil comercial está limpo. Comece cadastrando uma nova oportunidade para
              acompanhar o avanço das negociações.
            </p>
            <div className="mt-5">
              <button
                onClick={() => openCreateModal('novo')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C9A227] hover:bg-[#B8860B] text-[#0A0A0A] text-xs sm:text-sm font-semibold px-4 py-2.5 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar primeiro negócio</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* KANBAN BOARD: 5 COLUNAS COM SCROLL RESPONSIVO             */
          /* ========================================================= */
          <div className="flex-1 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start overflow-x-auto min-w-full">
              {colunasData.map((coluna) => {
                const isGanho = coluna.chave === 'fechado_ganho'
                const isPerdido = coluna.chave === 'fechado_perdido'
                const isDragOver = dragOverCol === coluna.chave

                return (
                  <section
                    key={coluna.chave}
                    onDragOver={(e) => handleDragOver(e, coluna.chave)}
                    onDragLeave={(e) => handleDragLeave(e, coluna.chave)}
                    onDrop={(e) => handleDrop(e, coluna.chave)}
                    className={`rounded-2xl border transition-all flex flex-col min-h-[500px] ${
                      isDragOver
                        ? 'border-[#C9A227] bg-[#FBF9F0]/80 shadow-md ring-2 ring-[#C9A227]/30'
                        : isGanho
                          ? 'border-emerald-300/80 bg-emerald-50/20'
                          : isPerdido
                            ? 'border-rose-300/70 bg-rose-50/20'
                            : 'border-[#E5E7EB] bg-[#FAF9F6]/70'
                    }`}
                  >
                    {/* Cabeçalho da Coluna */}
                    <div
                      className={`p-3.5 border-b rounded-t-2xl flex flex-col gap-1.5 ${
                        isGanho
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : isPerdido
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isGanho && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          {isPerdido && <XCircle className="w-4 h-4 text-rose-600" />}
                          <h2
                            className={`font-semibold text-sm ${
                              isGanho
                                ? 'text-emerald-950 font-bold'
                                : isPerdido
                                  ? 'text-rose-950 font-bold'
                                  : 'text-[#0A0A0A]'
                            }`}
                          >
                            {coluna.titulo}
                          </h2>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isGanho
                              ? 'bg-emerald-200 text-emerald-900'
                              : isPerdido
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-[#E5E7EB] text-[#0A0A0A]'
                          }`}
                        >
                          {coluna.quantidade}
                        </span>
                      </div>

                      {/* Total financeiro acumulado no estágio */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5">
                        <span className="text-[#6B7280] text-[11px]">Soma no estágio</span>
                        <span
                          className={`font-semibold text-[13px] ${
                            isGanho
                              ? 'text-emerald-800'
                              : isPerdido
                                ? 'text-rose-800'
                                : 'text-[#0A0A0A]'
                          }`}
                        >
                          {formatarMoeda(coluna.somaValor)}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Cards da Coluna */}
                    <div className="p-2.5 space-y-2.5 flex-1 flex flex-col">
                      {coluna.itens.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-[#E5E7EB] rounded-xl text-center">
                          <p className="text-xs text-neutral-400">Nenhum negócio aqui</p>
                          <button
                            type="button"
                            onClick={() => openCreateModal(coluna.chave)}
                            className="mt-2 text-[11px] font-semibold text-[#A8862B] hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar
                          </button>
                        </div>
                      ) : (
                        coluna.itens.map((item) => {
                          const prob = item.probabilidade ?? 0

                          return (
                            <article
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item.id)}
                              onClick={() => openEditModal(item)}
                              className={`bg-white rounded-xl border p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative ${
                                draggedId === item.id ? 'opacity-40 border-[#C9A227]' : ''
                              } ${
                                isGanho
                                  ? 'border-emerald-200 hover:border-emerald-400'
                                  : isPerdido
                                    ? 'border-rose-200 hover:border-rose-400'
                                    : 'border-[#E5E7EB] hover:border-[#C9A227]/70'
                              }`}
                            >
                              {/* Título do Card */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-sm text-[#0A0A0A] group-hover:text-[#A8862B] transition-colors leading-snug line-clamp-2">
                                  {item.titulo}
                                </h3>
                                <div
                                  className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(item)}
                                    className="p-1 rounded text-neutral-400 hover:text-[#0A0A0A] hover:bg-[#F7F5F1]"
                                    title="Editar negócio"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => promptDelete(item, e)}
                                    className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                    title={
                                      isAdmin
                                        ? 'Excluir negócio'
                                        : 'Exclusão permitida para administradores'
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Nome do Cliente */}
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#6B7280]">
                                <Building2 className="w-3.5 h-3.5 text-[#A8862B] shrink-0" />
                                <span className="truncate font-medium text-neutral-700">
                                  {item.cliente_nome}
                                </span>
                              </div>

                              {/* Valor Formatado R$ */}
                              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-[#F0EFEB]">
                                <span className="font-playfair text-base font-bold text-[#0A0A0A]">
                                  {formatarMoeda(item.valor)}
                                </span>

                                {/* Badge de Probabilidade */}
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    prob >= 70
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : prob >= 40
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                  }`}
                                  title={`Probabilidade de fechamento: ${prob}%`}
                                >
                                  <Percent className="w-2.5 h-2.5" />
                                  {prob}%
                                </span>
                              </div>

                              {/* Barra fina de Probabilidade */}
                              <div className="w-full bg-[#E5E7EB] h-1 rounded-full mt-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isGanho
                                      ? 'bg-emerald-500'
                                      : isPerdido
                                        ? 'bg-rose-400'
                                        : prob >= 70
                                          ? 'bg-emerald-500'
                                          : prob >= 40
                                            ? 'bg-[#C9A227]'
                                            : 'bg-neutral-400'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, prob))}%` }}
                                />
                              </div>

                              {/* Data de Fechamento Previsto se existir */}
                              {item.data_fechamento_previsto && (
                                <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#6B7280]">
                                  <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span>
                                    Previsto:{' '}
                                    <strong className="text-neutral-700 font-medium">
                                      {formatarDataPtBr(item.data_fechamento_previsto)}
                                    </strong>
                                  </span>
                                </div>
                              )}

                              {/* Controles de Mudança Rápida (Fallback Mobile e Acessibilidade) */}
                              <div
                                className="mt-3 pt-2 border-t border-[#F0EFEB] flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">
                                  Mover:
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => avancarEstagio(item, 'voltar')}
                                    disabled={coluna.chave === 'novo'}
                                    className="p-1 rounded border border-[#E5E7EB] hover:bg-[#F7F5F1] disabled:opacity-30 disabled:pointer-events-none text-neutral-600"
                                    title="Mover para estágio anterior"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>

                                  <select
                                    value={item.estagio}
                                    onChange={(e) =>
                                      void moverEstagio(item.id, e.target.value as EstagioChave)
                                    }
                                    className="text-[11px] bg-white border border-[#E5E7EB] rounded px-1.5 py-0.5 outline-none font-medium text-neutral-700 cursor-pointer max-w-[110px]"
                                  >
                                    {ESTAGIOS.map((est) => (
                                      <option key={est.chave} value={est.chave}>
                                        {est.titulo}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => avancarEstagio(item, 'avancar')}
                                    disabled={coluna.chave === 'fechado_perdido'}
                                    className="p-1 rounded border border-[#E5E7EB] hover:bg-[#F7F5F1] disabled:opacity-30 disabled:pointer-events-none text-neutral-600"
                                    title="Avançar para próximo estágio"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        })
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR NEGÓCIO                             */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl border border-[#C9A227]/40 shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-[#0A0A0A] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#C9A227]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#C9A227]/40 flex items-center justify-center text-[#E8C766]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-playfair text-lg sm:text-xl font-bold tracking-tight text-white">
                    {editingItem ? 'Editar negócio' : 'Novo negócio no pipeline'}
                  </h2>
                  <p className="text-[11px] text-[#E8C766]/80 font-inter">
                    Preencha as informações comerciais do lead ou oportunidade
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

            {/* Formulário */}
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
                {/* Título do Negócio */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Título da oportunidade <span className="text-[#C9A227]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => handleFormChange('titulo', e.target.value)}
                    placeholder="Ex.: BPO Financeiro e Controladoria — 12 Meses"
                    className={`w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors ${
                      formErrors.titulo
                        ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                        : 'border-[#E5E7EB] bg-white focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]'
                    }`}
                  />
                  {formErrors.titulo && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.titulo}</p>
                  )}
                </div>

                {/* Cliente Vinculado (Select) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Cliente / Contato <span className="text-[#C9A227]">*</span>
                  </label>
                  <select
                    value={form.cliente}
                    onChange={(e) => handleFormChange('cliente', e.target.value)}
                    className={`w-full text-sm rounded-lg border px-3 py-2 outline-none bg-white transition-colors ${
                      formErrors.cliente
                        ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                        : 'border-[#E5E7EB] focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]'
                    }`}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  {formErrors.cliente && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {formErrors.cliente}
                    </p>
                  )}
                </div>

                {/* Criar Cliente Inline */}
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] mb-1">
                    Ou cadastrar novo contato
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      placeholder="Nome do cliente..."
                      className="w-full text-sm rounded-lg border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#C9A227]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCriarClienteInline()}
                      disabled={criandoCliente || !novoClienteNome.trim()}
                      className="shrink-0 rounded-lg bg-[#0A0A0A] hover:bg-[#1f1f1f] disabled:opacity-40 text-[#E8C766] px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {criandoCliente ? 'Criando...' : '+ Criar'}
                    </button>
                  </div>
                  {clienteInlineError && (
                    <p className="text-[11px] text-red-600 mt-1">{clienteInlineError}</p>
                  )}
                </div>

                {/* Valor R$ */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Valor total (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A8862B]">
                      R$
                    </span>
                    <input
                      type="text"
                      value={form.valor}
                      onChange={(e) => handleFormChange('valor', e.target.value)}
                      placeholder="8500.00"
                      className={`w-full text-sm rounded-lg border pl-9 pr-3 py-2 outline-none transition-colors ${
                        formErrors.valor
                          ? 'border-red-500 bg-red-50/40'
                          : 'border-[#E5E7EB] bg-white focus:border-[#C9A227]'
                      }`}
                    />
                  </div>
                  {formErrors.valor && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.valor}</p>
                  )}
                </div>

                {/* Estágio do Pipeline */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Estágio no pipeline
                  </label>
                  <select
                    value={form.estagio}
                    onChange={(e) => handleFormChange('estagio', e.target.value as EstagioChave)}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  >
                    {ESTAGIOS.map((est) => (
                      <option key={est.chave} value={est.chave}>
                        {est.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Probabilidade (Slider + Input 0 a 100) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#0A0A0A]">
                      Probabilidade de fechamento
                    </label>
                    <span className="text-xs font-bold text-[#A8862B]">{form.probabilidade}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={form.probabilidade}
                      onChange={(e) => handleFormChange('probabilidade', Number(e.target.value))}
                      className="w-full accent-[#C9A227] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.probabilidade}
                      onChange={(e) => handleFormChange('probabilidade', Number(e.target.value))}
                      className="w-16 text-xs text-center border rounded-lg py-1.5 border-[#E5E7EB] outline-none"
                    />
                  </div>
                </div>

                {/* Data de Fechamento Previsto (Date Picker) */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Data de fechamento prevista
                  </label>
                  <input
                    type="date"
                    value={form.data_fechamento_previsto}
                    onChange={(e) => handleFormChange('data_fechamento_previsto', e.target.value)}
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 outline-none focus:border-[#C9A227]"
                  />
                </div>

                {/* Observações com contador */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                    Observações comerciais
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.observacoes}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Detalhes da proposta, expectativas do cliente, condições de pagamento..."
                    className="w-full text-sm rounded-lg border border-[#E5E7EB] bg-white p-3 outline-none focus:border-[#C9A227]"
                  />
                  <div className="text-[11px] text-[#6B7280] text-right mt-0.5">
                    {form.observacoes.length}/1000 caracteres
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
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
                    <span>{editingItem ? 'Salvar alterações' : 'Criar negócio'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (RBAC 403)                 */}
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
              Tem certeza de que deseja remover o negócio{' '}
              <strong className="text-[#0A0A0A]">"{deletingItem.titulo}"</strong>? Esta ação é
              permanente no banco de dados.
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
