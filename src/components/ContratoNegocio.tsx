import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.17 — SPEC-3-017: contrato da oportunidade ganha (etapa preparacao_contrato).
// Consolidação (dados do CRM + o que falta) → variáveis ausentes → "Gerar contrato" →
// texto integral com Copiar texto + histórico de versões.
// Fonte: GET /backend/v1/contratos/{negocioId}, POST /backend/v1/negocios/{id}/contrato/gerar
// e GET /backend/v1/contratos/{negocioId}/versao/{v} (somente via endpoints).
// Visual harmonizado T3.09.

type Versao = { id: string; versao: number; status: string; gerado_em: string; gerado_por: string }
type Consol = {
  negocio_id: string
  titulo: string
  estagio: string
  empresa: { id: string; nome: string; cnpj: string }
  cliente: string
  comercial: { valor: number; servico: string; recorrencia: string; data_ganho: string }
  versoes: Versao[]
  completude: { pode_gerar: boolean; faltando: string[] }
}

const CAMPOS_VARIAVEIS: [string, string, 'text' | 'number' | 'area'][] = [
  ['razao_social', 'Razão social da contratante *', 'text'],
  ['cnpj', 'CNPJ da contratante *', 'text'],
  ['sede_contratante', 'Sede da contratante (endereço completo)', 'text'],
  ['representante_contratante', 'Representante legal da contratante *', 'text'],
  ['representante_prestador', 'Representante da Vibratto', 'text'],
  ['implantacao_total', 'Implantação — valor total (opcional, 2 parcelas)', 'number'],
  ['escopo_servicos', 'Escopo dos serviços (item 1.1) — vazio usa o padrão do serviço', 'area'],
  [
    'condicoes_financeiras',
    'Condições financeiras (item 5.1) — vazio gera a partir do negócio',
    'area',
  ],
  ['vigencia_inicio', 'Início da vigência (vazio usa a data do ganho)', 'text'],
  ['foro', 'Foro', 'text'],
  ['reajuste_indice', 'Índice de reajuste anual', 'text'],
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
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } }
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
            sede_contratante: form.sede_contratante?.trim(),
            representante_contratante: form.representante_contratante?.trim(),
            representante_prestador: form.representante_prestador?.trim() || 'Deniane Bezerra',
            implantacao_total: form.implantacao_total ? Number(form.implantacao_total) : 0,
            escopo_servicos: form.escopo_servicos?.trim(),
            condicoes_financeiras: form.condicoes_financeiras?.trim(),
            vigencia_inicio: form.vigencia_inicio?.trim(),
            foro: form.foro?.trim() || 'São Paulo/SP',
            reajuste_indice: form.reajuste_indice?.trim() || 'IPCA',
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
    data && data.comercial.valor
      ? data.comercial.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
                  Recorrência: <b className="text-[#0A0A0A]">{data.comercial.recorrencia || '—'}</b>
                </span>
                <span>
                  Serviço: <b className="text-[#0A0A0A]">{data.comercial.servico || '—'}</b>
                </span>
                <span>
                  Ganho em:{' '}
                  <b className="text-[#0A0A0A]">{data.comercial.data_ganho?.slice(0, 10) || '—'}</b>
                </span>
              </div>
            </div>

            {/* Completude */}
            <div
              className={`mb-5 p-4 rounded-xl border ${
                data.completude.pode_gerar
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {data.completude.pode_gerar
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
                {CAMPOS_VARIAVEIS.map(([k, label, tipo]) => (
                  <label key={k} className="block text-sm font-medium">
                    {label}
                    {tipo === 'area' ? (
                      <textarea
                        value={form[k] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                      />
                    ) : (
                      <input
                        type={tipo === 'number' ? 'number' : 'text'}
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
                      key={v.id}
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
