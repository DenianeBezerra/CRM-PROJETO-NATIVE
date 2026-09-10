import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Pergunta = {
  id: string
  texto: string
  tipo: 'texto_livre' | 'numero' | 'sim_nao' | 'escolha_unica'
  opcoes?: string
  obrigatoria: boolean
  ordem: number
  aplicavel_a: string
}
type Completude = {
  total_perguntas: number
  respondidas: number
  percentual: number
  obrigatorias_pendentes: number
  qualificacao_configurada: boolean
  pendencias: { pergunta_id: string; texto: string; obrigatoria: boolean; tipo: string }[]
}
type Oportunidade = { id: string; titulo: string; estagio?: string }

export default function QualificacaoNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [respostas, setRespostas] = useState<Record<string, Record<string, unknown>>>({})
  const [completude, setCompletude] = useState<Completude | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    try {
      const [todas, comp] = await Promise.all([
        pb.collection('perguntas_qualificacao').getFullList<Pergunta>({ sort: 'ordem' }),
        pb.send<Completude>(`/backend/v1/qualificacao/${negocio.id}/completude`),
      ])
      const etapa = negocio.estagio || ''
      const aplicaveis = todas.filter((p) => p.aplicavel_a === 'todas' || p.aplicavel_a === etapa)
      setPerguntas(aplicaveis)
      setCompletude(comp)
      const existentes: Record<string, Record<string, unknown>> = {}
      if (aplicaveis.length) {
        const registros = await pb
          .collection('respostas_qualificacao')
          .getFullList<Record<string, unknown>>({
            filter: `negocio = '${negocio.id}'`,
          })
        for (const r of registros) {
          existentes[String(r.pergunta)] = r
        }
      }
      setRespostas(existentes)
      const draft: Record<string, string> = {}
      for (const p of aplicaveis) {
        const r = existentes[p.id]
        if (r) {
          if (p.tipo === 'numero') draft[p.id] = String(r.resposta_numero ?? '')
          else if (p.tipo === 'sim_nao') draft[p.id] = r.resposta_bool ? 'true' : 'false'
          else draft[p.id] = String(r.resposta_texto ?? '')
        } else {
          draft[p.id] = ''
        }
      }
      setRascunho(draft)
    } catch {
      setError('Não foi possível carregar a qualificação desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const salvar = async (pergunta: Pergunta) => {
    setError('')
    const valor = (rascunho[pergunta.id] ?? '').trim()
    if (pergunta.tipo === 'numero' && valor !== '' && !Number.isFinite(Number(valor)))
      return setError('Informe um número válido.')
    if (pergunta.obrigatoria && valor === '')
      return setError('Esta pergunta é obrigatória e não pode ficar vazia.')
    if (pergunta.tipo === 'escolha_unica') {
      const opcoes = (pergunta.opcoes || '')
        .split(';')
        .map((o) => o.trim())
        .filter(Boolean)
      if (!opcoes.includes(valor))
        return setError('Escolha uma das opções configuradas para esta pergunta.')
    }
    setSaving(pergunta.id)
    try {
      const payload: Record<string, unknown> = {
        negocio: negocio.id,
        pergunta: pergunta.id,
        resposta_texto: pergunta.tipo === 'numero' ? '' : valor,
        resposta_numero: pergunta.tipo === 'numero' && valor !== '' ? Number(valor) : null,
        resposta_bool: pergunta.tipo === 'sim_nao' ? valor === 'true' : null,
        respondido_por: pb.authStore.record?.id,
      }
      const existente = respostas[pergunta.id]
      if (existente) {
        await pb.collection('respostas_qualificacao').update(String(existente.id), payload)
      } else {
        const novo = await pb.collection('respostas_qualificacao').create(payload)
        setRespostas((prev) => ({ ...prev, [pergunta.id]: novo }))
      }
      toast({ title: 'Resposta salva' })
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível salvar a resposta.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Qualificação</h2>
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
        {completude && (
          <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Completude da qualificação</span>
              <span className="text-sm font-bold text-[#A8862B]">{completude.percentual}%</span>
            </div>
            <div className="w-full h-2 bg-white rounded-full overflow-hidden border">
              <div
                className="h-full bg-[#C9A227] transition-all"
                style={{ width: `${completude.percentual}%` }}
              />
            </div>
            <p className="text-xs text-[#6B7280] mt-2">
              {completude.qualificacao_configurada
                ? `${completude.respondidas} de ${completude.total_perguntas} perguntas respondidas${
                    completude.obrigatorias_pendentes > 0
                      ? ` · ${completude.obrigatorias_pendentes} obrigatória(s) pendente(s)`
                      : ' · nenhuma obrigatória pendente'
                  }`
                : 'Nenhuma pergunta de qualificação configurada para esta etapa.'}
            </p>
          </div>
        )}
        {perguntas.length === 0 ? (
          <p className="text-[#6B7280] text-sm">
            Nenhuma pergunta aplicável a esta etapa. Configure perguntas em Administração →
            Qualificação.
          </p>
        ) : (
          <div className="space-y-4">
            {perguntas.map((p) => (
              <div key={p.id} className="border rounded-xl p-4">
                <p className="text-sm font-medium mb-2">
                  {p.ordem}. {p.texto}
                  {p.obrigatoria && (
                    <span className="ml-2 text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                      obrigatória
                    </span>
                  )}
                  {respostas[p.id] && (
                    <span className="ml-2 text-xs rounded-full bg-green-50 text-green-700 px-2 py-0.5">
                      respondida
                    </span>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  {p.tipo === 'sim_nao' ? (
                    <select
                      value={rascunho[p.id] ?? ''}
                      onChange={(e) => setRascunho((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  ) : p.tipo === 'escolha_unica' ? (
                    <select
                      value={rascunho[p.id] ?? ''}
                      onChange={(e) => setRascunho((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Selecione</option>
                      {(p.opcoes || '')
                        .split(';')
                        .map((o) => o.trim())
                        .filter(Boolean)
                        .map((opcao) => (
                          <option key={opcao} value={opcao}>
                            {opcao}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type={p.tipo === 'numero' ? 'number' : 'text'}
                      value={rascunho[p.id] ?? ''}
                      onChange={(e) => setRascunho((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                  <button
                    onClick={() => void salvar(p)}
                    disabled={saving === p.id}
                    className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {saving === p.id ? 'Salvando...' : respostas[p.id] ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
