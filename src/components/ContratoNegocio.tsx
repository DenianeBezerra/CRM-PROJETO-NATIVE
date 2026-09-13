import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.17 — SPEC-3-017: contrato da oportunidade ganha (etapa preparacao_contrato).
// Consolidação (dados do CRM + o que falta) → campos das variáveis ausentes →
// "Gerar contrato" → texto integral com Copiar texto + histórico de versões.
// Fonte: /backend/v1/contratos/{negocioId} e POST /negocios/{id}/contrato/gerar
// (somente via endpoints — coleção bloqueada para UI direta). Visual harmonizado T3.09.

type Versao = { versao: number; status: string; gerado_em: string; gerado_por: string }
type Consol = {
  negocio_id: string
  negocio: {
    titulo: string
    valor: number
    recorrencia: string
    servico: string
    data_ganho: string
    estagio: string
  }
  empresa: { id: string; nome: string; cnpj: string }
  versoes: Versao[]
  ultima_versao: number
  completude: { pronto_para_gerar: boolean; faltando: string[] }
}

const CAMPOS_VARIAVEIS: [string, string, string?][] = [
  ['razao_social', 'Razão social da contratante *'],
  ['cnpj', 'CNPJ da contratante *'],
  ['sede', 'Sede (endereço completo)'],
  ['representante_contratante', 'Representante legal da contratante *'],
  ['representante_prestador', 'Representante da Vibratto'],
  ['escopo_servicos', 'Escopo dos serviços (item 1.1) *'],
  ['condicoes_financeiras', 'Condições financeiras (item 5.1) *'],
  ['foro', 'Foro'],
  ['vigencia_inicio', 'Início da vigência (12 meses, renovação automática)'],
  ['indice_reajuste', 'Índice de reajuste anual'],
]

export default function ContratoNegocio({
  negocio,
  onClose,
}: {
  negocio: { id: string; titulo: string }
  onClose: () => void
}) {
  const { toast } = useToast()
  const [data, setData] = useState<Consol | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [gerando, setGerando] = useState(false)
  const [texto, setTexto] = useState('')
  const [versaoAtual, setVersaoAtual] = useState<number | null>(null)

  const load = async () => {
    try {
      const r = await pb.send<Consol>(`/backend/v1/contratos/${negocio.id}`)
      setData(r)
      setForm((f) => ({
        ...f,
        cnpj: f.cnpj || r.empresa.cnpj || '',
      }))
    } catch (err: unknown) {
      const e2 = err as { status?: number; response?: { data?: { error?: string } } }
      setError(
        e2?.response?.data?.error || 'Não foi possível carregar o contrato desta oportunidade.',
      )
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocio.id])

  const gerar = async () => {
    setError('')
    setGerando(true)
    try {
      const r = await pb.send<{ versao: number; conteudo: string }>(
        `/backend/v1/negocios/${negocio.id}/contrato/gerar`,
        {
          method: 'POST',
          body: JSON.stringify({
            razao_social: form.razao_social?.trim(),
            cnpj: form.cnpj?.trim(),
            sede: form.sede?.trim(),
            representante_contratante: form.representante_contratante?.trim(),
            representante_prestador: form.representante_prestador?.trim() || 'Deniane Bezerra',
            escopo_servicos: form.escopo_servicos?.trim(),
            condicoes_financeiras: form.condicoes_financeiras?.trim(),
            foro: form.foro?.trim() || 'São Paulo/SP',
            vigencia_inicio: form.vigencia_inicio?.trim(),
            indice_reajuste: form.indice_reajuste?.trim() || 'IPCA',
          }),
        },
      )
      setTexto(r.conteudo)
      setVersaoAtual(r.versao)
      toast({ title: `Contrato v${r.versao} gerado` })
      await load()
    } catch (err: unknown) {
      const e2 = err as {
        data?: { error?: string; faltando?: string[] }
        response?: {
          data?: {
            error?: string
            faltando?: string[]
            data?: { error?: string; faltando?: string[] }
          }
        }
      }
      const corpo =
        e2?.response?.data?.faltando !== undefined
          ? e2.response.data
          : e2?.response?.data?.data?.faltando !== undefined
            ? e2.response.data.data
            : e2?.data?.faltando !== undefined
              ? e2.data
              : null
      if (corpo?.faltando?.length) {
        setError(`Dados mínimos ausentes: ${corpo.faltando.join('; ')}.`)
      } else {
        setError(corpo?.error || e2?.response?.data?.error || 'Não foi possível gerar o contrato.')
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
        {},
      )
      setTexto(r.conteudo)
      setVersaoAtual(v)
    } catch {
      setError('Não foi possível abrir a versão do contrato.')
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      toast({ title: 'Texto copiado' })
    } catch {
      toast({ title: 'Não foi possível copiar automaticamente', variant: 'destructive' })
    }
  }

  const valorFmt =
    data && data.negocio.valor
      ? data.negocio.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—'

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
          <p className="text-sm text-[#6B7280]">Carregando contrato...</p>
        ) : (
          <>
            {/* Consolidação — o que o CRM já sabe */}
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
                  Valor: <b className="text-[#0A0A0A]">{valorFmt}</b>
                </span>
                <span>
                  Recorrência: <b className="text-[#0A0A0A]">{data.negocio.recorrencia || '—'}</b>
                </span>
                <span>
                  Serviço: <b className="text-[#0A0A0A]">{data.negocio.servico || '—'}</b>
                </span>
                <span>
                  Ganho em:{' '}
                  <b className="text-[#0A0A0A]">{data.negocio.data_ganho?.slice(0, 10) || '—'}</b>
                </span>
              </div>
            </div>

            {/* Completude */}
            <div
              className={`mb-5 p-4 rounded-xl border ${
                data.completude.pronto_para_gerar
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {data.completude.pronto_para_gerar
                  ? '✅ Tudo pronto para gerar o contrato'
                  : '⚠️ O que falta antes de gerar:'}
              </p>
              {data.completude.faltando.length > 0 && (
                <ul className="text-xs text-[#6B7280] list-disc pl-4">
                  {data.completude.faltando.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Variáveis ausentes */}
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2">Variáveis do contrato</p>
              <div className="space-y-3">
                {CAMPOS_VARIAVEIS.map(([k, label]) => (
                  <label key={k} className="block text-sm font-medium">
                    {label}
                    {k === 'escopo_servicos' || k === 'condicoes_financeiras' ? (
                      <textarea
                        value={form[k] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                      />
                    ) : (
                      <input
                        value={form[k] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                      />
                    )}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => void gerar()}
                  disabled={gerando}
                  className="bg-[#C9A227] rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {gerando ? 'Gerando...' : 'Gerar contrato'}
                </button>
              </div>
            </div>

            {/* Histórico de versões */}
            {data.versoes.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-semibold mb-2">Versões</p>
                <div className="flex flex-wrap gap-2">
                  {data.versoes.map((v) => (
                    <button
                      key={v.versao}
                      type="button"
                      onClick={() => void abrirVersao(v.versao)}
                      className={`text-xs px-3 py-1.5 rounded-full border ${
                        versaoAtual === v.versao
                          ? 'bg-[#C9A227] text-[#0A0A0A] border-[#C9A227] font-semibold'
                          : 'bg-white text-[#6B7280] hover:bg-[#F7F5F1]'
                      }`}
                    >
                      v{v.versao} · {v.status} · {v.gerado_em?.slice(0, 10)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Texto integral */}
            {texto && (
              <div className="mb-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold">
                    Contrato {versaoAtual ? `— versão v${versaoAtual}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copiar()}
                    className="bg-[#C9A227] rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    Copiar texto
                  </button>
                </div>
                <pre className="text-xs whitespace-pre-wrap bg-[#F7F5F1] border rounded-xl p-4 max-h-80 overflow-auto">
                  {texto}
                </pre>
                <p className="text-xs text-[#6B7280] mt-2">
                  O envio para assinatura segue via ClickSign — o texto copiado é colado no
                  documento que será enviado (integração direta entra na task seguinte).
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
