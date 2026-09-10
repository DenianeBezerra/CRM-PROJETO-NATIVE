import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Pergunta = {
  id: string
  texto: string
  tipo: 'texto_livre' | 'numero' | 'sim_nao' | 'escolha_unica'
  opcoes?: string
  obrigatoria: boolean
  ordem: number
  aplicavel_a: 'todas' | 'novo' | 'contato_feito' | 'proposta'
  ativa: boolean
  sistema: boolean
}
const tipoOptions = [
  { value: 'texto_livre', label: 'Texto livre' },
  { value: 'numero', label: 'Número' },
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'escolha_unica', label: 'Escolha única' },
]
const aplicavelOptions = [
  { value: 'todas', label: 'Todas as etapas' },
  { value: 'novo', label: 'Novo' },
  { value: 'contato_feito', label: 'Contato feito' },
  { value: 'proposta', label: 'Proposta' },
]
const empty = {
  texto: '',
  tipo: 'texto_livre',
  opcoes: '',
  obrigatoria: 'false',
  ordem: '10',
  aplicavel_a: 'todas',
}

export default function Qualificacao() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState<Pergunta[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      setItems(
        await pb.collection('perguntas_qualificacao').getFullList<Pergunta>({ sort: 'ordem' }),
      )
    } catch {
      setError('Não foi possível carregar as perguntas de qualificação.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const ordered = useMemo(() => [...items].sort((a, b) => a.ordem - b.ordem), [items])
  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))
  const reset = () => {
    setForm(empty)
    setEditing(null)
    setShow(false)
    setError('')
  }
  const proximaOrdem = () =>
    ordered.length ? String(Math.max(...ordered.map((p) => p.ordem)) + 10) : '10'
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const texto = form.texto.trim()
    const ordem = Number(form.ordem)
    if (texto.length < 3) return setError('Informe o texto da pergunta (mínimo 3 caracteres).')
    if (!Number.isInteger(ordem) || ordem < 0)
      return setError('A ordem deve ser um número inteiro não negativo.')
    if (form.tipo === 'escolha_unica') {
      const opcoes = form.opcoes
        .split(';')
        .map((o) => o.trim())
        .filter(Boolean)
      if (opcoes.length < 2) return setError('Informe ao menos 2 opções separadas por ";".')
    }
    if (items.some((x) => x.ativa && x.ordem === ordem && x.id !== editing))
      return setError('Já existe uma pergunta ativa com essa ordem.')
    try {
      const payload = {
        texto,
        tipo: form.tipo,
        opcoes: form.tipo === 'escolha_unica' ? form.opcoes.trim() : '',
        obrigatoria: form.obrigatoria === 'true',
        ordem,
        aplicavel_a: form.aplicavel_a,
      }
      if (editing) await pb.collection('perguntas_qualificacao').update(editing, payload)
      else
        await pb
          .collection('perguntas_qualificacao')
          .create({ ...payload, ativa: true, sistema: false })
      toast({ title: editing ? 'Pergunta atualizada' : 'Pergunta criada' })
      reset()
      await load()
    } catch {
      setError('Não foi possível salvar a pergunta. Nenhuma alteração foi confirmada.')
    }
  }
  const toggle = async (item: Pergunta) => {
    setError('')
    try {
      await pb.collection('perguntas_qualificacao').update(item.id, { ativa: !item.ativa })
      await load()
      toast({ title: item.ativa ? 'Pergunta inativada' : 'Pergunta reativada' })
    } catch {
      setError('Não foi possível alterar a pergunta. Nenhuma alteração foi confirmada.')
    }
  }
  const label = (options: { value: string; label: string }[], value?: string) =>
    options.find((option) => option.value === value)?.label || value || ''
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
            setForm({ ...empty, ordem: proximaOrdem() })
            setError('')
            setShow(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Nova pergunta
        </button>
      </header>
      <main className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Administração
        </p>
        <h1 className="font-playfair text-4xl font-bold">Qualificação</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Configure as perguntas do diagnóstico de qualificação — sem código.
        </p>
        {error && !show && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando perguntas...</p>
        ) : ordered.length === 0 ? (
          <p className="text-[#6B7280]">
            Nenhuma pergunta configurada. Crie a primeira com “Nova pergunta”.
          </p>
        ) : (
          <div className="space-y-3">
            {ordered.map((item) => (
              <article
                key={item.id}
                className="bg-white border rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    {item.ordem}. {item.texto}
                    {item.obrigatoria && (
                      <span className="ml-2 text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                        obrigatória
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {label(tipoOptions, item.tipo)}
                    {item.tipo === 'escolha_unica' && item.opcoes ? ` · ${item.opcoes}` : ''} ·{' '}
                    {label(aplicavelOptions, item.aplicavel_a)} · {item.ativa ? 'ativa' : 'inativa'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(item.id)
                      setForm({
                        texto: item.texto,
                        tipo: item.tipo,
                        opcoes: item.opcoes || '',
                        obrigatoria: item.obrigatoria ? 'true' : 'false',
                        ordem: String(item.ordem),
                        aplicavel_a: item.aplicavel_a,
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
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between mb-5">
              <h2 className="font-playfair text-2xl font-bold">
                {editing ? 'Editar pergunta' : 'Nova pergunta'}
              </h2>
              <button type="button" onClick={reset}>
                <X />
              </button>
            </div>
            {error && <p className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</p>}
            <label className="block text-sm font-medium mb-3">
              Pergunta *
              <textarea
                value={form.texto}
                onChange={(e) => update('texto', e.target.value)}
                maxLength={500}
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium mb-3">
              Tipo de resposta *
              <select
                value={form.tipo}
                onChange={(e) => update('tipo', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.tipo === 'escolha_unica' && (
              <label className="block text-sm font-medium mb-3">
                Opções (separadas por ";") *
                <input
                  value={form.opcoes}
                  onChange={(e) => update('opcoes', e.target.value)}
                  maxLength={1000}
                  placeholder="Ex.: Até 50; 50 a 200; Acima de 200"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
            )}
            <label className="block text-sm font-medium mb-3">
              Aplicável a *
              <select
                value={form.aplicavel_a}
                onChange={(e) => update('aplicavel_a', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                {aplicavelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <label className="text-sm font-medium">
                Ordem *
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.ordem}
                  onChange={(e) => update('ordem', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Obrigatória
                <select
                  value={form.obrigatoria}
                  onChange={(e) => update('obrigatoria', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </label>
            </div>
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
