import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Tarefa = {
  id: string
  titulo: string
  descricao?: string
  responsavel: string
  responsavel_nome?: string
  prioridade: string
  prazo?: string
  status: string
  resultado?: string
  concluida_em?: string
  created?: string
}
type Oportunidade = { id: string; titulo: string }
type Usuario = { id: string; name: string }

const prioridadeLabel: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}
const prioridadeCor: Record<string, string> = {
  baixa: 'bg-[#F7F5F1]',
  media: 'bg-amber-100',
  alta: 'bg-red-100',
}

export default function TarefasNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [prazo, setPrazo] = useState('')
  const [resultadoAberta, setResultadoAberta] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const registros = await pb.collection('tarefas').getFullList<Tarefa>({
        filter: `negocio = '${negocio.id}'`,
        sort: '-created',
        expand: 'responsavel',
      })
      setTarefas(
        registros.map((t) => ({
          ...t,
          responsavel_nome:
            (t as Tarefa & { expand?: { responsavel?: Usuario } }).expand?.responsavel?.name || '',
        })),
      )
    } catch {
      setError('Não foi possível carregar as tarefas desta oportunidade.')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  useEffect(() => {
    pb.collection('users')
      .getFullList<Usuario>({ sort: 'name' })
      .then(setUsers)
      .catch(() => {
        /* lista de usuários indisponível para o perfil atual */
      })
  }, [])

  const salvar = async () => {
    setError('')
    if (titulo.trim().length < 3) return setError('Informe um título com pelo menos 3 caracteres.')
    if (!responsavel) return setError('Atribua um responsável à tarefa.')
    setSaving(true)
    try {
      await pb.collection('tarefas').create({
        negocio: negocio.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        responsavel,
        prioridade,
        prazo: prazo || undefined,
      })
      toast({ title: 'Tarefa criada' })
      setTitulo('')
      setDescricao('')
      setResponsavel('')
      setPrioridade('media')
      setPrazo('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível criar a tarefa.')
    } finally {
      setSaving(false)
    }
  }

  const concluir = async (t: Tarefa) => {
    setError('')
    const resultado = (resultadoAberta[t.id] || '').trim()
    if (resultado.length < 10)
      return setError('Concluir exige o resultado: descreva o que foi feito (mín. 10 caracteres).')
    try {
      await pb.collection('tarefas').update(t.id, { status: 'concluida', resultado })
      toast({ title: 'Tarefa concluída' })
      setResultadoAberta((prev) => ({ ...prev, [t.id]: '' }))
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível concluir a tarefa.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Tarefas</h2>
            <p className="text-sm text-[#6B7280]">{negocio.titulo}</p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {error}
          </p>
        )}
        <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
          <p className="text-sm font-semibold mb-2">Nova tarefa</p>
          <label className="block text-sm font-medium mb-3">
            Título *
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              placeholder="Ex.: Enviar proposta revisada"
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium mb-3">
            Descrição
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={5000}
              rows={2}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <label className="block text-sm font-medium">
              Responsável *
              <select
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Prioridade *
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Prazo
              <input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
            className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar tarefa'}
          </button>
        </div>
        {tarefas.length === 0 ? (
          <p className="text-[#6B7280] text-sm">
            Nenhuma tarefa registrada para esta oportunidade.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Tarefas ({tarefas.length})</p>
            {tarefas.map((t) => (
              <div key={t.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 font-semibold ${prioridadeCor[t.prioridade] || 'bg-[#F7F5F1]'}`}
                  >
                    {prioridadeLabel[t.prioridade] || t.prioridade}
                  </span>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">{t.status}</span>
                  {t.responsavel_nome && (
                    <span className="text-xs text-[#6B7280]">· {t.responsavel_nome}</span>
                  )}
                  {t.prazo && (
                    <span className="text-xs text-[#6B7280]">
                      · prazo {new Date(t.prazo.replace(' ', 'T')).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold">{t.titulo}</p>
                {t.descricao && <p className="text-sm text-[#6B7280] mt-1">{t.descricao}</p>}
                {t.status === 'aberta' ? (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-semibold mb-1">Concluir (resultado obrigatório)</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={resultadoAberta[t.id] || ''}
                        onChange={(e) =>
                          setResultadoAberta((prev) => ({ ...prev, [t.id]: e.target.value }))
                        }
                        placeholder="O que foi feito? (mín. 10 caracteres)"
                        className="flex-1 border rounded-lg px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void concluir(t)}
                        className="text-xs border rounded px-2 py-1 font-semibold text-green-700"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] mt-2">
                    Resultado: {t.resultado}
                    {t.concluida_em
                      ? ` · ${new Date(t.concluida_em.replace(' ', 'T')).toLocaleString('pt-BR')}`
                      : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
