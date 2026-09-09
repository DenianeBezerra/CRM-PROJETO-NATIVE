import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Etapa = {
  id: string
  chave: string
  nome: string
  ordem: number
  ativa: boolean
  sistema: boolean
}
const empty = { chave: '', nome: '', ordem: '10', ativa: true }

export default function Stages() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState<Etapa[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [migration, setMigration] = useState<{ item: Etapa; target: string } | null>(null)
  const load = async () => {
    setLoading(true)
    try {
      setItems(await pb.collection('etapas_negocio').getFullList<Etapa>({ sort: 'ordem' }))
    } catch {
      setError('Não foi possível carregar as etapas.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const ordered = useMemo(() => [...items].sort((a, b) => a.ordem - b.ordem), [items])
  const reset = () => {
    setForm(empty)
    setEditing(null)
    setShow(false)
    setError('')
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const chave = form.chave.trim().toLowerCase()
    const nome = form.nome.trim()
    const ordem = Number(form.ordem)
    if (!/^[a-z0-9_]+$/.test(chave))
      return setError('Use uma chave com letras minúsculas, números e sublinhado.')
    if (nome.length < 2) return setError('Informe um nome válido.')
    if (!Number.isInteger(ordem) || ordem < 0)
      return setError('A ordem deve ser um número inteiro não negativo.')
    if (items.some((x) => x.chave === chave && x.id !== editing))
      return setError('Essa chave já existe.')
    try {
      const payload = {
        chave: editing ? items.find((x) => x.id === editing)?.chave : chave,
        nome,
        ordem,
        ativa: form.ativa,
      }
      if (editing) await pb.collection('etapas_negocio').update(editing, payload)
      else await pb.collection('etapas_negocio').create({ ...payload, sistema: false })
      toast({ title: editing ? 'Etapa atualizada' : 'Etapa criada' })
      reset()
      await load()
    } catch {
      setError('Não foi possível salvar a etapa. Nenhuma alteração foi confirmada.')
    }
  }
  const toggle = async (item: Etapa) => {
    setError('')
    try {
      if (item.ativa) {
        const used = await pb
          .collection('negocios')
          .getList(1, 1, { filter: `estagio = '${item.chave}'` })
        if (used.totalItems > 0) {
          setMigration({ item, target: '' })
          return
        }
      }
      await pb.collection('etapas_negocio').update(item.id, { ativa: !item.ativa })
      await load()
      toast({ title: item.ativa ? 'Etapa inativada' : 'Etapa reativada' })
    } catch {
      setError('Não foi possível alterar o status da etapa. Nenhuma alteração foi confirmada.')
    }
  }
  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-5xl mx-auto flex justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={() => {
            setForm(empty)
            setError('')
            setShow(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Nova etapa
        </button>
      </header>
      <main className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Administração
        </p>
        <h1 className="font-playfair text-4xl font-bold">Etapas comerciais</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Configure o pipeline sem apagar oportunidades existentes.
        </p>
        {error && !show && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando etapas...</p>
        ) : (
          <div className="space-y-3">
            {ordered.map((item) => (
              <article
                key={item.id}
                className="bg-white border rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    {item.ordem}. {item.nome}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {item.chave} · {item.sistema ? 'sistema' : 'personalizada'} ·{' '}
                    {item.ativa ? 'ativa' : 'inativa'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(item.id)
                      setForm({
                        chave: item.chave,
                        nome: item.nome,
                        ordem: String(item.ordem),
                        ativa: item.ativa,
                      })
                      setError('')
                      setShow(true)
                    }}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <Pencil className="w-3 h-3 inline mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => void toggle(item)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    {item.ativa ? (
                      'Inativar'
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Reativar
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {migration && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-playfair text-2xl font-bold">Migrar oportunidades</h2>
            <p className="text-sm text-[#6B7280] mt-2">
              A etapa {migration.item.nome} está em uso. Escolha um destino ativo antes de
              inativá-la.
            </p>
            <label className="block text-sm font-medium mt-4">
              Destino ativo
              <select
                value={migration.target}
                onChange={(e) => setMigration({ ...migration, target: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione</option>
                {ordered
                  .filter(
                    (stage) =>
                      stage.ativa &&
                      stage.id !== migration.item.id &&
                      stage.chave !== 'fechado_ganho' &&
                      stage.chave !== 'fechado_perdido',
                  )
                  .map((stage) => (
                    <option key={stage.id} value={stage.chave}>
                      {stage.nome}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setMigration(null)} className="border rounded-lg px-4 py-2">
                Cancelar
              </button>
              <button
                disabled={!migration.target}
                onClick={async () => {
                  try {
                    await pb.collection('etapas_negocio').update(migration.item.id, {
                      ativa: false,
                      migracao_destino: migration.target,
                    })
                    setMigration(null)
                    await load()
                    toast({ title: 'Etapa migrada e inativada' })
                  } catch {
                    setError('Migração não concluída. Nenhuma alteração confirmada.')
                    setMigration(null)
                  }
                }}
                className="bg-[#C9A227] rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
              >
                Migrar e inativar
              </button>
            </div>
          </div>
        </div>
      )}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between mb-5">
              <h2 className="font-playfair text-2xl font-bold">
                {editing ? 'Editar etapa' : 'Nova etapa'}
              </h2>
              <button type="button" onClick={reset}>
                <X />
              </button>
            </div>
            {error && <p className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</p>}
            <label className="block text-sm font-medium mb-3">
              Chave técnica
              <input
                disabled={Boolean(editing)}
                value={form.chave}
                onChange={(e) => setForm({ ...form, chave: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
              />
            </label>
            <label className="block text-sm font-medium mb-3">
              Nome
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium mb-5">
              Ordem
              <input
                type="number"
                min="0"
                step="1"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-3">
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
