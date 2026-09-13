import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardList, Mail, Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.16 — SPEC-3-016: Implantação de cliente (cap. 7 do doc da CEO).
// Lista de implantações + quadro de etapas + conclusão condicionada (checklist do que falta).
// Fonte: /backend/v1/implantacoes (somente via endpoints — coleções bloqueadas para UI direta).
// Visual harmonizado T3.09.

type Etapa = {
  id: string
  ordem: number
  titulo: string
  descricao: string
  status: string
  evidencia: string
  concluida_em: string
}
type ImplLista = {
  id: string
  empresa: string
  empresa_id: string
  status: string
  data_inicio: string
  etapas_total: number
  etapas_concluidas: number
  pct: number
}
type ImplDetalhe = {
  id: string
  empresa: string
  status: string
  data_inicio: string
  etapas: Etapa[]
}
type EmpresaOpt = { id: string; nome: string; status: string }

const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}
const statusLabel: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  pendente: 'Pendente',
  nao_aplicavel: 'N/A',
}

export default function Implantacoes() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [lista, setLista] = useState<ImplLista[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState<ImplDetalhe | null>(null)
  const [novaOpen, setNovaOpen] = useState(false)
  const [empresaSel, setEmpresaSel] = useState('')
  const [evidenciaEtapa, setEvidenciaEtapa] = useState('')
  const [etapaAlvo, setEtapaAlvo] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<string[] | null>(null)
  const [emailGerado, setEmailGerado] = useState<{ assunto: string; texto: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await pb.send<{ total: number; itens: ImplLista[] }>('/backend/v1/implantacoes', {})
      setLista(r.itens || [])
      try {
        const emps = await pb.collection('empresas').getFullList<EmpresaOpt>({
          filter: "status = 'prospect' || status = 'inativa' || status = 'em_implantacao'",
          sort: 'nome',
        })
        setEmpresas(emps)
      } catch {
        setEmpresas([])
      }
    } catch {
      toast({ title: 'Falha ao carregar implantações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrirDetalhe = async (id: string) => {
    try {
      const r = await pb.send<ImplDetalhe>(`/backend/v1/implantacoes/${id}`, {})
      setDetalhe(r)
      setChecklist(null)
    } catch {
      toast({ title: 'Falha ao abrir implantação', variant: 'destructive' })
    }
  }

  const criar = async () => {
    if (!empresaSel) return
    try {
      await pb.send('/backend/v1/implantacoes', {
        method: 'POST',
        body: JSON.stringify({ empresa: empresaSel }),
      })
      toast({ title: 'Implantação criada com o modelo padrão (7 etapas)' })
      setNovaOpen(false)
      setEmpresaSel('')
      await load()
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response
          : undefined
      toast({
        title: response?.data?.error || 'Não foi possível criar a implantação',
        variant: 'destructive',
      })
    }
  }

  const concluirEtapa = async () => {
    if (!detalhe || !etapaAlvo) return
    try {
      await pb.send(`/backend/v1/implantacoes/${detalhe.id}/etapas/${etapaAlvo}/concluir`, {
        method: 'POST',
        body: JSON.stringify({ evidencia: evidenciaEtapa.trim() || undefined }),
      })
      toast({ title: 'Etapa concluída' })
      setEtapaAlvo(null)
      setEvidenciaEtapa('')
      await abrirDetalhe(detalhe.id)
      await load()
    } catch {
      toast({ title: 'Não foi possível concluir a etapa', variant: 'destructive' })
    }
  }

  const gerarEmail = async () => {
    if (!detalhe) return
    try {
      const r = await pb.send<{ assunto: string; texto: string }>(
        `/backend/v1/implantacoes/${detalhe.id}/email-boas-vindas`,
        {},
      )
      setEmailGerado({ assunto: r.assunto, texto: r.texto })
    } catch {
      toast({ title: 'Não foi possível gerar o e-mail', variant: 'destructive' })
    }
  }

  const concluirImplantacao = async () => {
    if (!detalhe) return
    setChecklist(null)
    try {
      await pb.send(`/backend/v1/implantacoes/${detalhe.id}/concluir`, { method: 'POST' })
      toast({ title: 'Implantação concluída — cliente ativo, rotinas serão geradas' })
      await abrirDetalhe(detalhe.id)
      await load()
    } catch (err: unknown) {
      // PocketBase ClientResponseError: err.response.data = corpo da resposta,
      // mas rotas custom podem vir em err.data ou err.response.data.data
      const e2 = err as {
        data?: { pendencias?: string[]; error?: string }
        response?: {
          data?: {
            pendencias?: string[]
            error?: string
            data?: { pendencias?: string[]; error?: string }
          }
        }
      }
      const corpo = e2?.response?.data?.pendencias
        ? e2.response.data
        : e2?.response?.data?.data?.pendencias
          ? e2.response.data.data
          : e2?.data?.pendencias
            ? e2.data
            : null
      if (corpo?.pendencias) {
        setChecklist(corpo.pendencias)
      }
      toast({
        title: corpo?.error || e2?.response?.data?.error || 'Conclusão bloqueada',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <button
          onClick={() => (detalhe ? setDetalhe(null) : navigate('/home'))}
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-[#E8C766] font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="font-playfair text-lg font-bold text-white">
          {detalhe ? `Implantação — ${detalhe.empresa}` : 'Implantação de clientes'}
        </h1>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-[#E8C766]"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8">
        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        )}

        {!loading && !detalhe && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setNovaOpen(true)}
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B]"
              >
                <Plus className="w-4 h-4" /> Nova implantação
              </button>
            </div>
            {novaOpen && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-6">
                <h3 className="font-playfair font-bold text-sm mb-2">Nova implantação</h3>
                <p className="text-xs text-[#6B7280] mb-3">
                  Instancia o modelo padrão de 7 etapas e marca a empresa como em implantação.
                </p>
                <select
                  value={empresaSel}
                  onChange={(e) => setEmpresaSel(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm mb-3"
                >
                  <option value="">Selecione a empresa...</option>
                  {empresas.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.nome} ({em.status})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setNovaOpen(false)}
                    className="text-sm px-3 py-1.5 rounded border border-[#E5E7EB] text-[#6B7280]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void criar()}
                    disabled={!empresaSel}
                    className="text-sm px-3 py-1.5 rounded font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B] disabled:opacity-50"
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}
            {lista.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Nenhuma implantação registrada. Crie a primeira a partir de uma empresa prospect ou
                inativa.
              </p>
            ) : (
              <div className="space-y-3">
                {lista.map((im) => (
                  <button
                    key={im.id}
                    onClick={() => void abrirDetalhe(im.id)}
                    className="w-full text-left bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#C9A227]/60 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="font-semibold">{im.empresa}</span>
                        <span className="text-[10px] rounded-full bg-[#F7F5F1] border border-[#E5E7EB] px-2 py-0.5 ml-2 text-[#6B7280]">
                          {statusLabel[im.status] || im.status}
                        </span>
                      </div>
                      <span className="text-xs text-[#6B7280]">
                        {im.etapas_concluidas}/{im.etapas_total} etapas · {im.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F3F4F6] rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-[#C9A227] rounded-full"
                        style={{ width: `${im.pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-2">
                      Início {dataBR(im.data_inicio)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && detalhe && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] rounded-full bg-[#F7F5F1] border border-[#E5E7EB] px-2 py-0.5 text-[#6B7280]">
                {statusLabel[detalhe.status] || detalhe.status}
              </span>
              <div className="flex gap-2">
                {detalhe.status === 'em_andamento' && (
                  <button
                    onClick={() => void gerarEmail()}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-semibold border border-[#C9A227] text-[#A8862B] hover:bg-[#F7F5F1]"
                  >
                    <Mail className="w-4 h-4" /> E-mail de boas-vindas
                  </button>
                )}
                {detalhe.status === 'em_andamento' && (
                  <button
                    onClick={() => void concluirImplantacao()}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Concluir implantação
                  </button>
                )}
              </div>
            </div>

            {checklist && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4">
                <h3 className="font-playfair font-bold text-sm mb-2">
                  Conclusão bloqueada — o que falta:
                </h3>
                <ul className="list-disc list-inside text-sm text-[#374151] space-y-1">
                  {checklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {emailGerado && (
              <div className="bg-white border border-[#C9A227]/50 rounded-xl p-4">
                <h3 className="font-playfair font-bold text-sm mb-1">
                  E-mail de boas-vindas — {emailGerado.assunto}
                </h3>
                <p className="text-[11px] text-[#6B7280] mb-2">
                  Revise, copie e envie pelo seu e-mail. O envio fica registrado na auditoria.
                </p>
                <pre className="text-xs whitespace-pre-wrap text-[#374151] bg-[#F7F5F1] rounded-lg p-3 border border-[#E5E7EB]">
                  {emailGerado.texto}
                </pre>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(emailGerado.texto)
                      toast({ title: 'Texto copiado' })
                    }}
                    className="text-sm px-3 py-1.5 rounded font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B]"
                  >
                    Copiar texto
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {detalhe.etapas.map((et) => (
                <div key={et.id} className="bg-white border border-[#E5E7EB] rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0A0A0A] text-[#E8C766] text-xs font-bold flex items-center justify-center">
                        {et.ordem}
                      </span>
                      <span className="font-semibold text-sm">{et.titulo}</span>
                      <span
                        className={
                          'text-[10px] rounded-full px-2 py-0.5 font-semibold ' +
                          (et.status === 'concluida'
                            ? 'bg-green-100 text-green-700'
                            : et.status === 'nao_aplicavel'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-800')
                        }
                      >
                        {statusLabel[et.status] || et.status}
                      </span>
                    </div>
                    {detalhe.status === 'em_andamento' &&
                      et.status !== 'concluida' &&
                      et.status !== 'nao_aplicavel' && (
                        <button
                          onClick={() => {
                            setEtapaAlvo(et.id)
                            setEvidenciaEtapa('')
                          }}
                          className="text-xs border rounded px-2 py-1 font-semibold text-[#6B7280]"
                        >
                          Concluir etapa
                        </button>
                      )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-2">{et.descricao}</p>
                  {et.evidencia && (
                    <p className="text-[11px] text-[#374151] mt-1">Evidência: {et.evidencia}</p>
                  )}
                  {et.concluida_em && (
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Concluída em {dataBR(et.concluida_em)}
                    </p>
                  )}
                  {etapaAlvo === et.id && (
                    <div className="mt-3 border-t border-[#F3F4F6] pt-3">
                      <input
                        value={evidenciaEtapa}
                        onChange={(e) => setEvidenciaEtapa(e.target.value)}
                        placeholder="Evidência (opcional) — ex.: link, protocolo, referência"
                        className="w-full border rounded-lg p-2 text-sm mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEtapaAlvo(null)}
                          className="text-sm px-3 py-1.5 rounded border border-[#E5E7EB] text-[#6B7280]"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => void concluirEtapa()}
                          className="text-sm px-3 py-1.5 rounded font-semibold bg-[#C9A227] text-[#0A0A0A] hover:bg-[#B8912B]"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
