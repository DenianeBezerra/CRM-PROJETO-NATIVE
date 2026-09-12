import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type FichaData = {
  negocio_id: string
  oportunidade: Record<string, unknown>
  qualificacao: {
    percentual: number | null
    respostas: { pergunta: string; resposta: string; obrigatoria: boolean }[]
  }
  diagnostico: {
    versao: number
    resumo: string
    pontos_de_dor: string
    decisao_envolvida: string
  } | null
  formulario: {
    solucao: string
    respondido_em: string
    resumo: string
    respostas: Record<string, unknown>
  } | null
  ficha: {
    id: string
    versao: number
    solucao_recomendada: string
    escopo_sugerido: string
    frequencia_atuacao: string
    senioridade: string
    entregaveis: string
    premissas_precificacao: string
    pontos_a_confirmar: string
  } | null
  completude: { pronto_para_proposta: boolean; faltando: string[] }
}

type Oportunidade = { id: string; titulo: string }

const CAMPOS: [string, string, number?][] = [
  ['solucao_recomendada', 'Solução recomendada', 3000],
  ['escopo_sugerido', 'Escopo sugerido', 5000],
  ['frequencia_atuacao', 'Frequência de atuação', 1000],
  ['senioridade', 'Nível de senioridade necessário', 1000],
  ['entregaveis', 'Entregáveis', 5000],
  ['premissas_precificacao', 'Premissas de precificação', 5000],
  ['pontos_a_confirmar', 'Pontos a confirmar antes do envio', 5000],
]

export default function FichaPropostaNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [data, setData] = useState<FichaData | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const resp = await pb.send<FichaData>(`/backend/v1/fichas/${negocio.id}`)
      setData(resp)
      if (resp.ficha) {
        setForm({
          solucao_recomendada: resp.ficha.solucao_recomendada,
          escopo_sugerido: resp.ficha.escopo_sugerido,
          frequencia_atuacao: resp.ficha.frequencia_atuacao,
          senioridade: resp.ficha.senioridade,
          entregaveis: resp.ficha.entregaveis,
          premissas_precificacao: resp.ficha.premissas_precificacao,
          pontos_a_confirmar: resp.ficha.pontos_a_confirmar,
        })
      }
    } catch {
      setError('Não foi possível carregar a ficha desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const salvar = async () => {
    setError('')
    if (motivo.trim().length < 10)
      return setError('Informe o motivo da atualização (mínimo 10 caracteres).')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        negocio: negocio.id,
        motivo_atualizacao: motivo.trim(),
        ...form,
      }
      if (data?.ficha) {
        payload.versao = (data.ficha.versao || 0) + 1
        await pb.collection('fichas_proposta').update(data.ficha.id, payload)
      } else {
        payload.versao = 1
        payload.criado_por = pb.authStore.record?.id
        await pb.collection('fichas_proposta').create(payload)
      }
      toast({ title: 'Ficha salva', description: 'Versão registrada com auditoria.' })
      setMotivo('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível salvar a ficha.')
    } finally {
      setSaving(false)
    }
  }

  const pct = data?.qualificacao?.percentual

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Ficha de preparação da proposta</h2>
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
        {!data ? (
          <p className="text-sm text-[#6B7280]">Carregando ficha...</p>
        ) : (
          <>
            {/* Completude */}
            <div
              className={`mb-5 p-4 rounded-xl border ${
                data.completude.pronto_para_proposta
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {data.completude.pronto_para_proposta
                  ? '✅ Pronto para preparar a proposta'
                  : '⚠️ O que falta antes da proposta:'}
              </p>
              {data.completude.faltando.length > 0 && (
                <ul className="text-xs text-[#6B7280] list-disc pl-4">
                  {data.completude.faltando.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Oportunidade */}
            <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
              <p className="text-sm font-semibold mb-2">Oportunidade</p>
              <div className="grid sm:grid-cols-2 gap-1 text-xs text-[#6B7280]">
                <span>
                  Contato:{' '}
                  <b className="text-[#0A0A0A]">{String(data.oportunidade.contato || '—')}</b>
                </span>
                <span>
                  Empresa:{' '}
                  <b className="text-[#0A0A0A]">{String(data.oportunidade.empresa || '—')}</b>
                </span>
                <span>
                  Serviço:{' '}
                  <b className="text-[#0A0A0A]">{String(data.oportunidade.servico || '—')}</b>
                </span>
                <span>
                  Origem: <b className="text-[#0A0A0A]">{String(data.oportunidade.canal || '—')}</b>
                  {data.oportunidade.origem_especifica
                    ? ` · ${String(data.oportunidade.origem_especifica)}`
                    : ''}
                </span>
                <span>
                  Formulário:{' '}
                  <b className="text-[#0A0A0A]">
                    {String(data.oportunidade.formulario_status || '—')}
                  </b>
                </span>
                <span>
                  Próxima ação:{' '}
                  <b className="text-[#0A0A0A]">
                    {String(data.oportunidade.proxima_acao_descricao || '—')}
                  </b>
                </span>
              </div>
            </div>

            {/* Formulário respondido */}
            {data.formulario ? (
              <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
                <p className="text-sm font-semibold mb-2">
                  Formulário respondido ({data.formulario.solucao})
                </p>
                <pre className="text-xs whitespace-pre-wrap">{data.formulario.resumo}</pre>
              </div>
            ) : (
              <p className="mb-5 text-xs text-[#6B7280]">
                Nenhum formulário respondido ainda — envie pelo menu "Formulário".
              </p>
            )}

            {/* Qualificação */}
            <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
              <p className="text-sm font-semibold mb-2">
                Qualificação {pct !== null && pct !== undefined ? `— ${pct}%` : ''}
              </p>
              {data.qualificacao.respostas.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Sem respostas registradas.</p>
              ) : (
                <ul className="text-xs space-y-1">
                  {data.qualificacao.respostas.map((r, i) => (
                    <li key={i}>
                      <b>{r.pergunta}:</b> {r.resposta || '—'}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Diagnóstico */}
            {data.diagnostico ? (
              <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
                <p className="text-sm font-semibold mb-2">
                  Diagnóstico (v{data.diagnostico.versao})
                </p>
                <p className="text-xs whitespace-pre-wrap">{data.diagnostico.resumo}</p>
                {data.diagnostico.pontos_de_dor && (
                  <p className="text-xs text-[#6B7280] mt-1">
                    Dores: {data.diagnostico.pontos_de_dor}
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-5 text-xs text-[#6B7280]">Sem diagnóstico registrado.</p>
            )}

            {/* Ficha editável */}
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">
                Leitura do time {data.ficha ? `(v${data.ficha.versao})` : '(nova)'}
              </p>
              <div className="space-y-3">
                {CAMPOS.map(([k, label, max]) => (
                  <label key={k} className="block text-sm font-medium">
                    {label}
                    <textarea
                      value={form[k] || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      maxLength={max || 5000}
                      rows={2}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                ))}
                <label className="block text-sm font-medium">
                  Motivo da atualização * (mín. 10 caracteres)
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={500}
                    placeholder="Ex.: incluído escopo após formulário do cliente"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void salvar()}
                  disabled={saving}
                  className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : data.ficha ? 'Salvar nova versão' : 'Criar ficha'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
