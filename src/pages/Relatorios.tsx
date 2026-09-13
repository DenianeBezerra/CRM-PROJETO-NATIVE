import React, { useEffect, useState } from 'react'
import { ArrowLeft, Mail, Plus, Send, Power } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

// T3.19 — SPEC-3-019: Relatórios agendados (backlog Etapa 3 §2.3).
// Fonte: GET/POST/PATCH /backend/v1/relatorios + POST /{id}/enviar (admin-only).
// Visual harmonizado T3.09 (ícone preto + glifo dourado, CTA dourado).

type Relatorio = {
  id: string
  nome: string
  tipo: string
  periodicidade: string
  dia_semana: number
  hora_utc: number
  destinatarios: string
  ativo: boolean
  ultimo_envio_em: string | null
  ultimo_status: string | null
}

const DIAS = ['—', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const dataBR = (s: string | null) => {
  if (!s) return '—'
  return new Date(s.replace(' ', 'T')).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function Relatorios() {
  const navigate = useNavigate()
  const [itens, setItens] = useState<Relatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [novo, setNovo] = useState({
    nome: '',
    periodicidade: 'semanal',
    dia_semana: '1',
    hora_utc: '11',
    destinatarios: 'deniane@vibratto.com.br',
  })
  const [criando, setCriando] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await pb.send<{ total: number; itens: Relatorio[] }>('/backend/v1/relatorios', {})
      setItens(r.itens || [])
    } catch {
      setError('Não foi possível carregar os agendamentos.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const criar = async () => {
    setCriando(true)
    setError('')
    try {
      await pb.send('/backend/v1/relatorios', {
        method: 'POST',
        body: JSON.stringify({
          nome: novo.nome,
          tipo: 'resumo_direcao',
          periodicidade: novo.periodicidade,
          dia_semana: Number(novo.dia_semana),
          hora_utc: Number(novo.hora_utc),
          destinatarios: novo.destinatarios,
        }),
      })
      setNovo({
        nome: '',
        periodicidade: 'semanal',
        dia_semana: '1',
        hora_utc: '11',
        destinatarios: 'deniane@vibratto.com.br',
      })
      await load()
    } catch (err: unknown) {
      const e = err as { data?: { data?: { error?: string }; message?: string } }
      setError(e?.data?.data?.error || e?.data?.message || 'Falha ao criar o agendamento.')
    } finally {
      setCriando(false)
    }
  }

  const alternar = async (r: Relatorio) => {
    setError('')
    try {
      await pb.send(`/backend/v1/relatorios/${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !r.ativo }),
      })
      await load()
    } catch {
      setError('Falha ao alterar o agendamento.')
    }
  }

  const enviarAgora = async (r: Relatorio) => {
    setError('')
    try {
      const res = await pb.send<{ enviados: number }>(`/backend/v1/relatorios/${r.id}/enviar`, {
        method: 'POST',
      })
      await load()
      return res?.enviados ?? 0
    } catch (err: unknown) {
      const e = err as { data?: { data?: { error?: string }; message?: string } }
      setError(e?.data?.data?.error || e?.data?.message || 'Falha no envio manual.')
      return 0
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-[#E8C766]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="font-playfair text-lg font-bold text-white">Relatórios agendados</h1>
        <span className="text-xs rounded-full bg-[#141414] border border-[#C9A227]/40 px-3 py-1 text-[#E8C766] font-semibold">
          Admin
        </span>
      </header>
      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && <p className="text-sm text-[#6B7280]">Carregando...</p>}
        {!loading && (
          <div className="space-y-6">
            <section className="space-y-3">
              {itens.length === 0 && (
                <p className="text-sm text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg p-4">
                  Nenhum relatório agendado ainda. Crie o primeiro abaixo — o resumo da direção
                  chega por e-mail no dia e hora combinados.
                </p>
              )}
              {itens.map((r) => (
                <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.nome}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {r.periodicidade === 'semanal'
                          ? `Semanal · ${DIAS[r.dia_semana] || '—'} · ${String(r.hora_utc).padStart(2, '0')}:00 UTC`
                          : `Mensal · dia 1 · ${String(r.hora_utc).padStart(2, '0')}:00 UTC`}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">Para: {r.destinatarios}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-1">
                        Último envio: {dataBR(r.ultimo_envio_em)} · status: {r.ultimo_status || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void enviarAgora(r)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] border border-[#C9A227]/60 rounded-lg px-3 py-1.5 hover:bg-[#F7F5F1]"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar agora
                      </button>
                      <button
                        onClick={() => void alternar(r)}
                        className={
                          'inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 border ' +
                          (r.ativo
                            ? 'text-green-700 border-green-200 bg-green-50'
                            : 'text-[#6B7280] border-[#E5E7EB] bg-white')
                        }
                      >
                        <Power className="w-3.5 h-3.5" /> {r.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            <section className="bg-[#F7F5F1] border border-dashed border-[#C9A227]/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766]">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <h2 className="font-playfair font-bold">Novo relatório agendado</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <input
                  placeholder="Nome (ex. Resumo da direção — semanal)"
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                  className="border border-[#E5E7EB] rounded-lg px-3 py-2 sm:col-span-2"
                />
                <select
                  value={novo.periodicidade}
                  onChange={(e) => setNovo({ ...novo, periodicidade: e.target.value })}
                  className="border border-[#E5E7EB] rounded-lg px-3 py-2"
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal (dia 1)</option>
                </select>
                <select
                  value={novo.dia_semana}
                  onChange={(e) => setNovo({ ...novo, dia_semana: e.target.value })}
                  disabled={novo.periodicidade === 'mensal'}
                  className="border border-[#E5E7EB] rounded-lg px-3 py-2 disabled:opacity-50"
                >
                  {DIAS.slice(1).map((d, i) => (
                    <option key={d} value={String(i + 1)}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={novo.hora_utc}
                  onChange={(e) => setNovo({ ...novo, hora_utc: e.target.value })}
                  className="border border-[#E5E7EB] rounded-lg px-3 py-2"
                >
                  <option value="11">11:00 UTC (08:00 BRT)</option>
                  <option value="12">12:00 UTC (09:00 BRT)</option>
                  <option value="14">14:00 UTC (11:00 BRT)</option>
                  <option value="22">22:00 UTC (19:00 BRT)</option>
                </select>
                <input
                  placeholder="Destinatários (e-mails separados por vírgula)"
                  value={novo.destinatarios}
                  onChange={(e) => setNovo({ ...novo, destinatarios: e.target.value })}
                  className="border border-[#E5E7EB] rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => void criar()}
                  disabled={criando || !novo.nome}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#0A0A0A] bg-[#C9A227] rounded-lg px-4 py-2 hover:bg-[#E8C766] disabled:opacity-50 sm:col-span-2"
                >
                  <Plus className="w-4 h-4" /> {criando ? 'Criando...' : 'Criar agendamento'}
                </button>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-2">
                O e-mail leva os KPIs agregados do painel de direção (sem dados pessoais) e o link
                do CRM.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
