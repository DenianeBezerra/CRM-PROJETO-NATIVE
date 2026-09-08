import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Stage = { chave: string; nome: string; ordem: number; ativa: boolean }
type Client = { id: string; nome: string }
type Opportunity = {
  id: string
  titulo: string
  cliente: string
  cliente_nome?: string
  valor?: number
  probabilidade?: number
  estagio?: string
  data_fechamento_previsto?: string
  observacoes?: string
}
const fallback: Stage[] = [
  { chave: 'novo', nome: 'Novo', ordem: 10, ativa: true },
  { chave: 'contato_feito', nome: 'Contato feito', ordem: 20, ativa: true },
  { chave: 'proposta', nome: 'Proposta', ordem: 30, ativa: true },
  { chave: 'fechado_ganho', nome: 'Fechado ganho', ordem: 40, ativa: true },
  { chave: 'fechado_perdido', nome: 'Fechado perdido', ordem: 50, ativa: true },
]

export default function Kanban() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [stages, setStages] = useState<Stage[]>(fallback)
  const [items, setItems] = useState<Opportunity[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [records, clients] = await Promise.all([
        pb.collection('negocios').getFullList<Opportunity>({ sort: '-created', expand: 'cliente' }),
        pb.collection('clientes').getFullList<Client>({ sort: 'nome' }),
      ])
      const byId = new Map(clients.map((client) => [client.id, client.nome]))
      setItems(
        records.map((item) => ({
          ...item,
          cliente_nome:
            (item as Opportunity & { expand?: { cliente?: Client } }).expand?.cliente?.nome ||
            byId.get(item.cliente),
        })),
      )
      try {
        const configured = await pb
          .collection('etapas_negocio')
          .getFullList<Stage>({ sort: 'ordem' })
        if (configured.length) setStages(configured)
      } catch {
        /* fallback preserves compatibility */
      }
    } catch {
      setError('Não foi possível carregar o kanban.')
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
      (item) => !q || `${item.titulo} ${item.cliente_nome || ''}`.toLowerCase().includes(q),
    )
  }, [items, search])
  const move = async (item: Opportunity, next: string) => {
    if (!next || next === item.estagio) return
    const previous = item.estagio
    setSaving(item.id)
    setError('')
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, estagio: next } : entry)),
    )
    try {
      await pb.collection('negocios').update(item.id, { estagio: next })
      toast({ title: 'Oportunidade movimentada' })
    } catch {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, estagio: previous } : entry)),
      )
      setError('Não foi possível movimentar a oportunidade. O estágio anterior foi preservado.')
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 w-full max-w-sm">
          <Search className="w-4 h-4 text-[#6B7280]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar oportunidade ou contato"
            className="bg-transparent outline-none w-full"
          />
        </div>
      </header>
      <main className="max-w-7xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Central Comercial
        </p>
        <h1 className="font-playfair text-4xl font-bold">Kanban comercial</h1>
        <p className="text-[#6B7280] mt-2 mb-6">Movimente oportunidades com segurança e clareza.</p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando kanban...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {stages.map((stage) => (
              <section key={stage.chave} className="bg-white/70 border rounded-xl p-3 min-h-60">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">{stage.nome}</h2>
                  <span className="text-xs bg-[#F7F5F1] rounded-full px-2 py-1">
                    {visible.filter((item) => item.estagio === stage.chave).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visible
                    .filter((item) => item.estagio === stage.chave)
                    .map((item) => (
                      <article key={item.id} className="bg-white border rounded-lg p-3 shadow-sm">
                        <h3 className="font-semibold text-sm">{item.titulo}</h3>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {item.cliente_nome || 'Contato não carregado'}
                        </p>
                        <p className="text-xs mt-2">
                          {item.valor == null
                            ? 'Valor não informado'
                            : `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}{' '}
                          · {item.probabilidade ?? 0}%
                        </p>
                        <label className="block text-xs font-medium mt-3">
                          Mover para
                          <select
                            aria-label={`Mover ${item.titulo}`}
                            disabled={saving === item.id}
                            value={item.estagio || ''}
                            onChange={(e) => void move(item, e.target.value)}
                            className="mt-1 w-full border rounded px-2 py-1 bg-white"
                          >
                            <option value={item.estagio}>{stage.nome}</option>
                            {stages
                              .filter((target) => target.ativa && target.chave !== item.estagio)
                              .map((target) => (
                                <option key={target.chave} value={target.chave}>
                                  {target.nome}
                                </option>
                              ))}
                          </select>
                        </label>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
