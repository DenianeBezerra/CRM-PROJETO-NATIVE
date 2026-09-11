import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

type Proposta = {
  id: string
  versao: number
  valor: number
  validade: string
  status: string
  resumo: string
  motivo_atualizacao?: string
  emitida_em?: string
  created?: string
}
type Oportunidade = { id: string; titulo: string }

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PropostaNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [versoes, setVersoes] = useState<Proposta[]>([])
  const [valor, setValor] = useState('')
  const [validade, setValidade] = useState('')
  const [resumo, setResumo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const registros = await pb.collection('propostas').getFullList<Proposta>({
        filter: `negocio = '${negocio.id}'`,
        sort: '-versao',
      })
      setVersoes(registros)
    } catch {
      setError('Não foi possível carregar as propostas desta oportunidade.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const emitir = async (p: Proposta) => {
    setError('')
    try {
      await pb.send(`/backend/v1/propostas/${p.id}/emitir`, { method: 'POST' })
      toast({ title: `Proposta v${p.versao} emitida`, description: 'Versão congelada.' })
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível emitir a proposta.')
    }
  }

  const salvar = async () => {
    setError('')
    const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(valorNum) || valorNum <= 0)
      return setError('Informe um valor maior que zero.')
    if (!validade) return setError('Informe a validade da proposta.')
    if (resumo.trim().length < 20) return setError('O resumo precisa de pelo menos 20 caracteres.')
    setSaving(true)
    try {
      await pb.collection('propostas').create({
        negocio: negocio.id,
        valor: valorNum,
        validade: validade,
        responsavel: pb.authStore.record?.id,
        resumo: resumo.trim(),
      })
      toast({ title: 'Rascunho de proposta criado' })
      setValor('')
      setValidade('')
      setResumo('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setError(response?.data?.message || 'Não foi possível criar o rascunho.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Proposta</h2>
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
          <p className="text-sm font-semibold mb-2">Novo rascunho de proposta</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <label className="block text-sm font-medium">
              Valor (R$) *
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 8336,11"
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Validade *
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm font-medium mb-3">
            Resumo * (mín. 20 caracteres)
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Escopo da proposta, entregas e condições"
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
            className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar rascunho'}
          </button>
        </div>
        {versoes.length === 0 ? (
          <p className="text-[#6B7280] text-sm">
            Nenhuma proposta registrada para esta oportunidade.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Propostas ({versoes.length} versão{versoes.length > 1 ? 'ões' : ''})
            </p>
            {versoes.map((v) => (
              <div key={v.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">v{v.versao}</span>
                  <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">{v.status}</span>
                  <span className="text-sm font-bold text-[#A8862B]">
                    {fmtBRL(Number(v.valor))}
                  </span>
                  {v.status === 'rascunho' && (
                    <button
                      type="button"
                      onClick={() => void emitir(v)}
                      className="ml-auto text-xs border rounded px-2 py-1 font-semibold"
                    >
                      Emitir
                    </button>
                  )}
                </div>
                {v.emitida_em && (
                  <p className="text-xs text-[#6B7280]">
                    Emitida em {new Date(v.emitida_em.replace(' ', 'T')).toLocaleString('pt-BR')}
                  </p>
                )}
                <p className="text-xs text-[#6B7280]">
                  Validade:{' '}
                  {v.validade
                    ? new Date(v.validade.replace(' ', 'T')).toLocaleDateString('pt-BR')
                    : '—'}
                </p>
                <p className="text-sm whitespace-pre-wrap mt-1">{v.resumo}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
