import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Diagnostico = {
  id: string
  versao: number
  resumo: string
  pontos_de_dor?: string
  decisao_envolvida?: string
  motivo_atualizacao?: string
  criado_por?: string
  created?: string
}
type Oportunidade = { id: string; titulo: string }

export default function DiagnosticoNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [versoes, setVersoes] = useState<Diagnostico[]>([])
  const [resumo, setResumo] = useState('')
  const [pontosDeDor, setPontosDeDor] = useState('')
  const [decisao, setDecisao] = useState('')
  const [motivoAtualizacao, setMotivoAtualizacao] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const registros = await pb.collection('diagnosticos').getFullList<Diagnostico>({
        filter: `negocio = '${negocio.id}'`,
        sort: '-versao',
      })
      setVersoes(registros)
    } catch {
      setError('Não foi possível carregar os diagnósticos desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const salvar = async () => {
    setError('')
    if (resumo.trim().length < 20)
      return setError('O resumo precisa de pelo menos 20 caracteres (núcleo mínimo).')
    if (versoes.length > 0 && motivoAtualizacao.trim().length < 10)
      return setError(
        'A partir da segunda versão, informe o motivo da atualização (mínimo 10 caracteres).',
      )
    setSaving(true)
    try {
      await pb.collection('diagnosticos').create({
        negocio: negocio.id,
        resumo: resumo.trim(),
        pontos_de_dor: pontosDeDor.trim(),
        decisao_envolvida: decisao.trim(),
        motivo_atualizacao: motivoAtualizacao.trim(),
      })
      toast({ title: 'Diagnóstico registrado', description: 'Nova versão criada.' })
      setResumo('')
      setPontosDeDor('')
      setDecisao('')
      setMotivoAtualizacao('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível registrar o diagnóstico.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Diagnóstico</h2>
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
          <p className="text-sm font-semibold mb-2">Nova versão de diagnóstico</p>
          <label className="block text-sm font-medium mb-2">
            Resumo * (mín. 20 caracteres)
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Leitura da situação atual da empresa, gargalos e oportunidade"
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          {versoes.length > 0 && (
            <label className="block text-sm font-medium mb-3">
              Motivo da atualização * (mín. 10 caracteres)
              <input
                value={motivoAtualizacao}
                onChange={(e) => setMotivoAtualizacao(e.target.value)}
                maxLength={1000}
                placeholder="Ex.: cliente sinalizou mudança de escopo na última conversa"
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          )}
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <label className="block text-sm font-medium">
              Pontos de dor
              <input
                value={pontosDeDor}
                onChange={(e) => setPontosDeDor(e.target.value)}
                maxLength={2000}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Decisão envolvida
              <input
                value={decisao}
                onChange={(e) => setDecisao(e.target.value)}
                maxLength={2000}
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
            {saving ? 'Salvando...' : 'Registrar diagnóstico'}
          </button>
        </div>
        {versoes.length === 0 ? (
          <p className="text-[#6B7280] text-sm">
            Nenhum diagnóstico registrado para esta oportunidade.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Histórico ({versoes.length} versão{versoes.length > 1 ? 'es' : ''})
            </p>
            {versoes.map((v) => (
              <div key={v.id} className="border rounded-xl p-4">
                <p className="text-xs text-[#6B7280] mb-1">
                  Versão {v.versao}
                  {v.created
                    ? ` · ${new Date(v.created.replace(' ', 'T')).toLocaleString('pt-BR')}`
                    : ''}
                </p>
                <p className="text-sm whitespace-pre-wrap">{v.resumo}</p>
                {v.motivo_atualizacao && (
                  <p className="text-xs text-[#6B7280] mt-1">
                    Motivo da atualização: {v.motivo_atualizacao}
                  </p>
                )}
                {v.pontos_de_dor && (
                  <p className="text-xs text-[#6B7280] mt-2">Dor: {v.pontos_de_dor}</p>
                )}
                {v.decisao_envolvida && (
                  <p className="text-xs text-[#6B7280]">Decisão: {v.decisao_envolvida}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
