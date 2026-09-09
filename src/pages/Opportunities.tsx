import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Plus, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

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
}
type Cliente = { id: string; nome: string }
type Etapa = { chave: string; nome: string; ordem: number; ativa: boolean }
const fallbackStages = [
  { chave: 'novo', nome: 'Novo', ordem: 10, ativa: true },
  { chave: 'contato_feito', nome: 'Contato feito', ordem: 20, ativa: true },
  { chave: 'proposta', nome: 'Proposta', ordem: 30, ativa: true },
  { chave: 'fechado_ganho', nome: 'Fechado ganho', ordem: 40, ativa: true },
  { chave: 'fechado_perdido', nome: 'Fechado perdido', ordem: 50, ativa: true },
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
}

export default function Opportunities() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState<Oportunidade[]>([])
  const [clients, setClients] = useState<Cliente[]>([])
  const [stages, setStages] = useState<Etapa[]>(fallbackStages)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [originalStage, setOriginalStage] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const [records, contacts] = await Promise.all([
        pb
          .collection('negocios')
          .getFullList<Oportunidade>({ sort: '-created', expand: 'cliente' }),
        pb.collection('clientes').getFullList<Cliente>({ sort: 'nome' }),
      ])
      setItems(
        records.map((item) => ({
          ...item,
          cliente_nome: (item as Oportunidade & { expand?: { cliente?: Cliente } }).expand?.cliente
            ?.nome,
        })),
      )
      setClients(contacts)
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
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      return setError('Informe um valor válido.')
    if (!Number.isFinite(probability) || probability < 0 || probability > 100)
      return setError('A probabilidade deve estar entre 0 e 100.')
    if (form.estagio === 'fechado_perdido' && !form.motivo_perda)
      return setError('Perda exige um motivo estruturado.')
    if (
      form.estagio === 'fechado_perdido' &&
      form.motivo_perda === 'outro' &&
      !form.motivo_perda_detalhe.trim()
    )
      return setError('Informe o detalhe do motivo de perda.')
    if (
      editing &&
      (originalStage === 'fechado_ganho' || originalStage === 'fechado_perdido') &&
      !form.estagio.startsWith('fechado_') &&
      !form.justificativa_reabertura.trim()
    )
      return setError('Reabertura exige uma justificativa.')
    try {
      const payload = {
        ...form,
        valor: value,
        probabilidade: probability,
        proxima_acao_em: form.proxima_acao_em || null,
        proxima_acao_descricao: form.proxima_acao_descricao || '',
        arquivado: form.arquivado === 'true',
      }
      if (editing) await pb.collection('negocios').update(editing, payload)
      else await pb.collection('negocios').create(payload)
      toast({ title: editing ? 'Oportunidade atualizada' : 'Oportunidade cadastrada' })
      reset()
      await load()
    } catch {
      setError('Não foi possível salvar. Verifique os campos e tente novamente.')
    }
  }
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((item) => (
              <article key={item.id} className="bg-white border rounded-xl p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{item.titulo}</h2>
                    <p className="text-sm text-[#6B7280]">
                      {item.cliente_nome || 'Contato não carregado'}
                    </p>
                  </div>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-1 h-fit">
                    {stages.find((stage) => stage.chave === item.estagio)?.nome || item.estagio}
                  </span>
                  {item.arquivado && (
                    <span className="text-xs rounded-full bg-neutral-200 px-2 py-1 h-fit">
                      Arquivada
                    </span>
                  )}
                </div>
                <p className="text-sm mt-4">
                  Valor:{' '}
                  {item.valor == null
                    ? 'não informado'
                    : `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}{' '}
                  · Probabilidade: {item.probabilidade ?? 0}%
                </p>
                <button
                  onClick={() => openEdit(item)}
                  className="text-xs flex items-center gap-1 border rounded px-2 py-1 mt-4"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
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
    </div>
  )
}
