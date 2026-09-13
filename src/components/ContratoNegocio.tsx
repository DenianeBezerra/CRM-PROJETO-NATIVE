import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.17 — SPEC-3-017: contrato gerado a partir do negócio ganho (etapa preparacao_contrato).
// Consolidação → variáveis ausentes editáveis → gerar versão → texto com Copiar texto
// + histórico de versões. Mesmo padrão do e-mail de boas-vindas (T3.16) e da ficha de
// proposta (T3.02b). Visual harmonizado T3.09.

type Consolidacao = {
  negocio_id: string
  titulo: string
  estagio: string
  empresa: { id: string; nome: string; cnpj: string }
  cliente: string
  comercial: {
    valor: number | null
    servico: string
    recorrencia: string
    data_ganho: string
  }
  versoes: {
    id: string
    versao: number
    status: string
    gerado_em: string
    gerado_por: string
  }[]
  completude: { pode_gerar: boolean; faltando: string[] }
}

type Oportunidade = { id: string; titulo: string }

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ContratoNegocio({
  negocio,
  onClose,
}: {
  negocio: Oportunidade
  onClose: () => void
}) {
  const { toast } = useToast()
  const [data, setData] = useState<Consolidacao | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [gerando, setGerando] = useState(false)
  const [textoVersao, setTextoVersao] = useState<{ versao: number; conteudo: string } | null>(null)

  const load = async () => {
    try {
      const resp = await pb.send<Consolidacao>(`/backend/v1/contratos/${negocio.id}`)
      setData(resp)
      setForm((f) => ({
        razao_social: f.razao_social ?? resp.empresa.nome ?? '',
        cnpj: f.cnpj ?? resp.empresa.cnpj ?? '',
        ...f,
      }))
    } catch {
      setError('Não foi possível carregar a consolidação do contrato.')
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const gerar = async () => {
    setError('')
    if (!form.razao_social?.trim()) return setError('Informe a razão social da contratante.')
    if (!form.cnpj?.trim()) return setError('Informe o CNPJ da contratante.')
    if (!form.representante_contratante?.trim())
      return setError('Informe o representante legal da contratante.')
    setGerando(true)
    try {
      const implNum = Number(
        String(form.implantacao_total || '')
          .replace(/\./g, '')
          .replace(',', '.'),
      )
      const r = await pb.send<{ versao: number; conteudo: string }>(
        `/backend/v1/negocios/${negocio.id}/contrato/gerar`,
        {
          method: 'POST',
          body: JSON.stringify({
            razao_social: form.razao_social.trim(),
            cnpj: form.cnpj.trim(),
            sede_contratante: form.sede_contratante?.trim() || undefined,
            representante_contratante: form.representante_contratante.trim(),
            representante_prestador: form.representante_prestador?.trim() || undefined,
            implantacao_total: Number.isFinite(implNum) && implNum > 0 ? implNum : undefined,
            vigencia_inicio: form.vigencia_inicio?.trim() || undefined,
            foro: form.foro?.trim() || undefined,
          }),
        },
      )
      toast({
        title: `Contrato v${r.versao} gerado`,
        description: 'Versão registrada com auditoria.',
      })
      setTextoVersao({ versao: r.versao, conteudo: r.conteudo })
      await load()
    } catch (err: unknown) {
      const corpo =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; faltando?: string[] } } }).response
              ?.data
          : undefined
      if (corpo?.faltando && corpo.faltando.length > 0) {
        setError('Falta: ' + corpo.faltando.join('; '))
      } else {
        setError(corpo?.error || 'Não foi possível gerar o contrato.')
      }
    } finally {
      setGerando(false)
    }
  }

  const abrirVersao = async (v: number) => {
    setError('')
    try {
      const r = await pb.send<{ conteudo: string }>(
        `/backend/v1/contratos/${negocio.id}/versao/${v}`,
      )
      setTextoVersao({ versao: v, conteudo: r.conteudo })
    } catch {
      setError('Não foi possível abrir a versão ' + v + '.')
    }
  }

  const copiar = async () => {
    if (!textoVersao) return
    try {
      await navigator.clipboard.writeText(textoVersao.conteudo)
      toast({ title: 'Texto copiado' })
    } catch {
      toast({ title: 'Não foi possível copiar automaticamente', variant: 'destructive' })
    }
  }

  const valor = data?.comercial?.valor
  const podeGerar = data?.completude?.pode_gerar

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-playfair text-2xl font-bold">Contrato</h2>
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
          <p className="text-sm text-[#6B7280]">Carregando consolidação...</p>
        ) : (
          <>
            {/* Completude */}
            <div
              className={`mb-5 p-4 rounded-xl border ${
                podeGerar ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {podeGerar
                  ? '✅ Dados prontos para gerar o contrato'
                  : '⚠️ O que falta para gerar:'}
              </p>
              {data.completude.faltando.length > 0 && (
                <ul className="text-xs text-[#6B7280] list-disc pl-4">
                  {data.completude.faltando.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dados do CRM */}
            <div className="mb-5 p-4 rounded-xl bg-[#F7F5F1] border">
              <p className="text-sm font-semibold mb-2">Dados do CRM</p>
              <div className="grid sm:grid-cols-2 gap-1 text-xs text-[#6B7280]">
                <span>
                  Empresa: <b className="text-[#0A0A0A]">{data.empresa.nome || '—'}</b>
                </span>
                <span>
                  CNPJ: <b className="text-[#0A0A0A]">{data.empresa.cnpj || '—'}</b>
                </span>
                <span>
                  Serviço: <b className="text-[#0A0A0A]">{data.comercial.servico || '—'}</b>
                </span>
                <span>
                  Recorrência: <b className="text-[#0A0A0A]">{data.comercial.recorrencia || '—'}</b>
                </span>
                <span>
                  Mensalidade:{' '}
                  <b className="text-[#0A0A0A]">
                    {valor != null && Number(valor) > 0 ? fmtBRL(Number(valor)) : '—'}
                  </b>
                </span>
                <span>
                  Ganho em:{' '}
                  <b className="text-[#0A0A0A]">
                    {data.comercial.data_ganho
                      ? new Date(data.comercial.data_ganho.replace(' ', 'T')).toLocaleDateString(
                          'pt-BR',
                        )
                      : '—'}
                  </b>
                </span>
              </div>
            </div>

            {/* Variáveis da geração (D15) */}
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">Dados do contrato</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Razão social da contratante *
                  <input
                    value={form.razao_social || ''}
                    onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  CNPJ da contratante *
                  <input
                    value={form.cnpj || ''}
                    onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Sede da contratante
                  <input
                    value={form.sede_contratante || ''}
                    onChange={(e) => setForm((f) => ({ ...f, sede_contratante: e.target.value }))}
                    placeholder="Endereço completo da sede"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Representante legal da contratante *
                  <input
                    value={form.representante_contratante || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, representante_contratante: e.target.value }))
                    }
                    placeholder="Nome e qualificação (ex.: sócio-administrador)"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Representante da Vibratto
                  <input
                    value={form.representante_prestador || 'Deniane Bezerra'}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, representante_prestador: e.target.value }))
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Implantação — total (R$)
                  <input
                    value={form.implantacao_total || ''}
                    onChange={(e) => setForm((f) => ({ ...f, implantacao_total: e.target.value }))}
                    inputMode="decimal"
                    placeholder="Deixe vazio se não houver"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Início da vigência
                  <input
                    type="date"
                    value={form.vigencia_inicio || ''}
                    onChange={(e) => setForm((f) => ({ ...f, vigencia_inicio: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Foro
                  <input
                    value={form.foro || 'São Paulo/SP'}
                    onChange={(e) => setForm((f) => ({ ...f, foro: e.target.value }))}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void gerar()}
                disabled={gerando || !podeGerar}
                className="mt-3 bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {gerando ? 'Gerando...' : 'Gerar contrato'}
              </button>
            </div>

            {/* Texto da versão */}
            {textoVersao && (
              <div className="mb-5 border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Contrato v{textoVersao.versao}</p>
                  <button
                    type="button"
                    onClick={() => void copiar()}
                    className="text-xs border border-[#C9A227]/50 rounded-full px-3 py-1.5 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] transition-colors"
                  >
                    Copiar texto
                  </button>
                </div>
                <pre className="text-xs whitespace-pre-wrap max-h-72 overflow-auto bg-[#F7F5F1] rounded-lg p-3">
                  {textoVersao.conteudo}
                </pre>
              </div>
            )}

            {/* Histórico de versões */}
            {data.versoes.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Versões ({data.versoes.length})</p>
                <div className="space-y-2">
                  {data.versoes.map((v) => (
                    <div key={v.id} className="border rounded-lg p-3 flex items-center gap-2">
                      <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                        v{v.versao}
                      </span>
                      <span className="text-xs rounded-full bg-[#F7F5F1] px-2 py-0.5">
                        {v.status}
                      </span>
                      {v.gerado_em && (
                        <span className="text-xs text-[#6B7280]">
                          {new Date(v.gerado_em.replace(' ', 'T')).toLocaleString('pt-BR')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void abrirVersao(v.versao)}
                        className="ml-auto text-xs border rounded px-2 py-1 font-semibold"
                      >
                        Abrir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
