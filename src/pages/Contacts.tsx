import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Pencil, Archive, RotateCcw, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Cliente = {
  id: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  cidade?: string
  origem?: string
  observacoes?: string
  status?: 'ativo' | 'inativo' | 'prospect'
}

const emptyForm = {
  nome: '',
  empresa: '',
  email: '',
  telefone: '',
  cidade: '',
  origem: 'outro',
  observacoes: '',
  status: 'prospect' as Cliente['status'],
}

export default function Contacts() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState<Cliente[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setItems(await pb.collection('clientes').getFullList<Cliente>({ sort: '-created' }))
    } catch {
      setError('Não foi possível carregar os contatos.')
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
      (x) =>
        !q || [x.nome, x.empresa, x.email, x.telefone].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [items, search])

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))
  const openEdit = (item: Cliente) => {
    setEditing(item.id)
    setForm({ ...emptyForm, ...item })
    setShowForm(true)
  }
  const reset = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(false)
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.nome.trim().length < 2) return setError('Informe um nome válido.')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      return setError('Informe um e-mail válido.')
    const duplicate = items.find(
      (x) =>
        x.id !== editing &&
        ((form.email && x.email === form.email) || (form.telefone && x.telefone === form.telefone)),
    )
    if (duplicate)
      return setError(`Possível duplicidade: ${duplicate.nome}. Revise antes de salvar.`)
    try {
      if (editing) await pb.collection('clientes').update(editing, form)
      else await pb.collection('clientes').create(form)
      toast({
        title: editing ? 'Contato atualizado' : 'Contato cadastrado',
        description: 'Os dados foram persistidos.',
      })
      reset()
      await load()
    } catch {
      setError('Não foi possível salvar. Verifique os campos e tente novamente.')
    }
  }
  const setStatus = async (id: string, status: Cliente['status']) => {
    await pb.collection('clientes').update(id, { status })
    await load()
    toast({ title: status === 'inativo' ? 'Contato arquivado' : 'Contato restaurado' })
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
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Novo contato
        </button>
      </header>
      <main className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
            Central Comercial
          </p>
          <h1 className="font-playfair text-4xl font-bold">Contatos e empresas</h1>
          <p className="text-[#6B7280] mt-2">
            Cadastre e mantenha a base comercial sem apagar histórico.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 mb-5">
          <Search className="w-4 h-4 text-[#6B7280]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail ou telefone"
            className="bg-transparent outline-none w-full"
          />
        </div>
        {error && !showForm && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando contatos...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((item) => (
              <article key={item.id} className="bg-white border rounded-xl p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{item.nome}</h2>
                    <p className="text-sm text-[#6B7280]">
                      {item.empresa || 'Empresa não informada'}
                    </p>
                  </div>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-1 h-fit">
                    {item.status}
                  </span>
                </div>
                <p className="text-sm mt-4">
                  {item.email || 'Sem e-mail'} · {item.telefone || 'Sem telefone'}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Origem: {item.origem || 'não informada'}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs flex items-center gap-1 border rounded px-2 py-1"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  {item.status === 'inativo' ? (
                    <button
                      onClick={() => void setStatus(item.id, 'ativo')}
                      className="text-xs flex items-center gap-1 border rounded px-2 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </button>
                  ) : (
                    <button
                      onClick={() => void setStatus(item.id, 'inativo')}
                      className="text-xs flex items-center gap-1 border rounded px-2 py-1"
                    >
                      <Archive className="w-3 h-3" /> Arquivar
                    </button>
                  )}
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
            className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-playfair text-2xl font-bold">
                {editing ? 'Editar contato' : 'Novo contato'}
              </h2>
              <button type="button" onClick={reset}>
                <X />
              </button>
            </div>
            {error && <p className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ['nome', 'Nome *'],
                  ['empresa', 'Empresa'],
                  ['email', 'E-mail'],
                  ['telefone', 'Telefone'],
                  ['cidade', 'Cidade'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm font-medium">
                  {label}
                  <input
                    value={form[key] || ''}
                    onChange={(e) => update(key, e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
              ))}
              <label className="text-sm font-medium">
                Origem
                <select
                  value={form.origem}
                  onChange={(e) => update('origem', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option>site</option>
                  <option>indicacao</option>
                  <option>redes_sociais</option>
                  <option>evento</option>
                  <option>outro</option>
                </select>
              </label>
            </div>
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
