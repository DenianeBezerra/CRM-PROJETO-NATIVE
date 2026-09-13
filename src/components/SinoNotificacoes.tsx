import React, { useEffect, useState, useMemo } from 'react'
import {
  Bell,
  Check,
  AlertTriangle,
  Clock,
  Settings2,
  ExternalLink,
  ChevronRight,
  TrendingDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { msgErro } from '@/lib/erro'

// T3.08 — SPEC-3-007 + Req 3: Notificações internas e alertas de negócios parados
type Notificacao = {
  id: string
  tipo: string
  lida: boolean
  negocio: string
  negocio_titulo: string
  origem_tarefa: string
  created: string
}

export type NegocioParado = {
  id: string
  titulo: string
  valor: number
  estagio: string
  diasParado: number
  dataReferencia: string
  clienteNome?: string
}

const tipoLabel: Record<string, string> = {
  mencao: 'Menção',
  tarefa_atribuida: 'Tarefa atribuída',
  comentario: 'Comentário',
}

const estagioLabel: Record<string, string> = {
  novo: 'Novo',
  contato_feito: 'Contato Feito',
  proposta: 'Proposta',
  fechado_ganho: 'Ganho',
  fechado_perdido: 'Perdido',
}

export function SinoNotificacoes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'alertas' | 'mensagens'>('alertas')

  // Notificações convencionais
  const [nots, setNots] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  // Negócios parados
  const [diasLimite, setDiasLimite] = useState(7)
  const [configId, setConfigId] = useState<string | null>(null)
  const [editandoDias, setEditandoDias] = useState(false)
  const [inputDias, setInputDias] = useState('7')
  const [salvandoDias, setSalvandoDias] = useState(false)

  const [negociosParados, setNegociosParados] = useState<NegocioParado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  // Carregar configuração de dias para alerta
  const carregarConfigDias = async () => {
    try {
      const rec = await pb
        .collection('configuracoes_operacionais')
        .getFirstListItem('chave = "dias_alerta_negocios_parados"')
      if (rec) {
        setConfigId(rec.id)
        const valor = Number(rec.valor_numero) || 7
        setDiasLimite(valor)
        setInputDias(String(valor))
        return valor
      }
    } catch {
      // Usa padrão 7 caso ainda não exista
    }
    return 7
  }

  // Carregar negócios parados no funil
  const carregarNegociosParados = async (limiteDias: number) => {
    try {
      setCarregando(true)
      setErroMsg(null)

      // Negócios em aberto (não ganho, não perdido, não arquivado)
      const lista = await pb.collection('negocios').getFullList({
        filter: 'arquivado = false && estagio != "fechado_ganho" && estagio != "fechado_perdido"',
        expand: 'cliente',
        sort: 'updated',
      })

      const agora = new Date().getTime()
      const msPorDia = 1000 * 60 * 60 * 24

      const parados: NegocioParado[] = []

      for (const n of lista) {
        // Usa updated como última atualização, fallback para created
        const dataStr = n.updated || n.created
        if (!dataStr) continue
        const dataRef = new Date(String(dataStr).replace(' ', 'T')).getTime()
        const diffDias = Math.floor((agora - dataRef) / msPorDia)

        if (diffDias >= limiteDias) {
          const rawExpand = n.expand as { cliente?: { nome?: string } } | undefined
          parados.push({
            id: n.id,
            titulo: n.titulo,
            valor: Number(n.valor) || 0,
            estagio: n.estagio,
            diasParado: diffDias,
            dataReferencia: String(dataStr),
            clienteNome: rawExpand?.cliente?.nome,
          })
        }
      }

      // Ordenar pelos mais parados primeiro
      parados.sort((a, b) => b.diasParado - a.diasParado)
      setNegociosParados(parados)
    } catch (err) {
      setErroMsg(msgErro(err) || 'Não foi possível carregar os alertas do funil.')
    } finally {
      setCarregando(false)
    }
  }

  // Notificações convencionais
  const loadNotificacoes = async () => {
    try {
      const r = await pb.send<{ total: number; itens: Notificacao[] }>(
        '/backend/v1/notificacoes',
        {},
      )
      setNots(r.itens || [])
      setNaoLidas((r.itens || []).filter((n) => !n.lida).length)
    } catch {
      /* silencioso — sino é acessório */
    }
  }

  const recarregarTudo = async () => {
    const dias = await carregarConfigDias()
    await Promise.all([loadNotificacoes(), carregarNegociosParados(dias)])
  }

  useEffect(() => {
    void recarregarTudo()
    const t = setInterval(() => void recarregarTudo(), 60000)
    return () => clearInterval(t)
  }, [])

  // Salvar novo limite de dias
  const salvarNovoLimite = async () => {
    const val = parseInt(inputDias, 10)
    if (isNaN(val) || val < 1) return
    setSalvandoDias(true)
    try {
      if (configId) {
        await pb.collection('configuracoes_operacionais').update(configId, {
          valor_numero: val,
        })
      } else {
        const novo = await pb.collection('configuracoes_operacionais').create({
          chave: 'dias_alerta_negocios_parados',
          valor_numero: val,
          descricao: 'Limite em dias sem atualização para alertar negócio parado no funil.',
        })
        setConfigId(novo.id)
      }
      setDiasLimite(val)
      setEditandoDias(false)
      await carregarNegociosParados(val)
    } catch (err) {
      setErroMsg(msgErro(err) || 'Erro ao salvar novo limite de dias.')
    } finally {
      setSalvandoDias(false)
    }
  }

  const marcarLida = async (n: Notificacao) => {
    try {
      await pb.send(`/backend/v1/notificacoes/${n.id}/lida`, { method: 'POST' })
      await loadNotificacoes()
      if (n.negocio) navigate(`/oportunidades?abrir=${n.negocio}`)
    } catch {
      /* falha silenciosa */
    }
  }

  // Total de pendências no badge: notificações não lidas + negócios parados
  const totalBadges = useMemo(() => {
    return naoLidas + negociosParados.length
  }, [naoLidas, negociosParados.length])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setAberto(!aberto)
          if (!aberto) void recarregarTudo()
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#C9A227]/40 bg-[#141414] hover:bg-[#C9A227] text-[#E8C766] hover:text-[#0A0A0A] transition-all cursor-pointer shadow-sm"
        aria-label="Central de Alertas e Notificações"
      >
        <Bell className="w-4 h-4" />
        {totalBadges > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#C9A227] text-[#0A0A0A] text-[10px] font-bold rounded-full min-w-[19px] h-[19px] flex items-center justify-center px-1 shadow border border-[#0A0A0A] animate-pulse">
            {totalBadges > 99 ? '99+' : totalBadges}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-88 sm:w-96 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl z-50 overflow-hidden text-[#0A0A0A]">
          {/* Cabeçalho */}
          <div className="px-4 py-3.5 bg-[#0A0A0A] border-b border-[#C9A227]/30 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
              <h3 className="font-playfair font-bold text-sm text-white">Central de Alertas</h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#222222] border border-[#C9A227]/40 text-[#E8C766]">
              {totalBadges} pendência(s)
            </span>
          </div>

          {/* Abas: Alertas de Funil (Negócios Parados) e Atividades */}
          <div className="flex border-b border-[#E5E7EB] bg-[#F7F5F1] p-1">
            <button
              type="button"
              onClick={() => setAbaAtiva('alertas')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                abaAtiva === 'alertas'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Negócios Parados</span>
              {negociosParados.length > 0 && (
                <span className="text-[10px] font-bold bg-[#FFF7D6] text-[#854D0E] px-1.5 py-0.2 rounded-full border border-[#C9A227]/30">
                  {negociosParados.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('mensagens')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                abaAtiva === 'mensagens'
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Atividades</span>
              {naoLidas > 0 && (
                <span className="text-[10px] font-bold bg-[#0A0A0A] text-[#E8C766] px-1.5 py-0.2 rounded-full">
                  {naoLidas}
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo Aba 1: Negócios Parados no Funil */}
          {abaAtiva === 'alertas' && (
            <div>
              {/* Barra de Ajuste de Limite (X dias) */}
              <div className="px-4 py-2.5 bg-[#FFFDF0] border-b border-[#E5E7EB] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#854D0E]">
                  <Clock className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>
                    Critério:{' '}
                    <strong className="text-[#0A0A0A] font-bold">&gt; {diasLimite} dias</strong> sem
                    atualização
                  </span>
                </div>
                {!editandoDias ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInputDias(String(diasLimite))
                      setEditandoDias(true)
                    }}
                    className="text-[11px] font-semibold text-[#854D0E] hover:text-[#0A0A0A] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3 text-[#C9A227]" />
                    <span>Ajustar (X)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={inputDias}
                      onChange={(e) => setInputDias(e.target.value)}
                      className="w-12 bg-white border border-[#C9A227] rounded px-1.5 py-0.5 text-xs font-bold text-center text-[#0A0A0A] focus:outline-none"
                    />
                    <span className="text-[11px] text-[#854D0E]">dias</span>
                    <button
                      type="button"
                      onClick={() => void salvarNovoLimite()}
                      disabled={salvandoDias}
                      className="px-2 py-0.5 bg-[#C9A227] hover:bg-[#E8C766] text-[#0A0A0A] text-[10px] font-bold rounded"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoDias(false)}
                      className="text-[10px] text-neutral-500 hover:text-black"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {erroMsg && (
                <div className="p-3 bg-red-50 text-xs text-red-700 border-b border-red-100">
                  {erroMsg}
                </div>
              )}

              {/* Lista com scroll */}
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F7F5F1]">
                {carregando ? (
                  <div className="p-8 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                    <span>Verificando oportunidades...</span>
                  </div>
                ) : negociosParados.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-[#0A0A0A]">
                      Funil em movimento saudável!
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Nenhum negócio sem atualização há mais de {diasLimite} dias.
                    </p>
                  </div>
                ) : (
                  negociosParados.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setAberto(false)
                        navigate(`/pipeline?busca=${encodeURIComponent(n.titulo)}`)
                      }}
                      className="p-3.5 hover:bg-[#FFFDF0] transition-colors cursor-pointer group flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            {estagioLabel[n.estagio] || n.estagio}
                          </span>
                          <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {n.diasParado} dias parado
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#0A0A0A] truncate group-hover:text-[#A8862B] transition-colors">
                          {n.titulo}
                        </p>
                        {n.clienteNome && (
                          <p className="text-[11px] text-[#6B7280] truncate">
                            Cliente: {n.clienteNome}
                          </p>
                        )}
                        <p className="text-[11px] font-semibold text-[#C9A227] mt-0.5">
                          {n.valor > 0
                            ? n.valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : 'Valor a definir'}
                        </p>
                      </div>
                      <div className="flex items-center self-center text-xs font-semibold text-[#A8862B] group-hover:translate-x-1 transition-transform shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Rodapé com link para o Pipeline */}
              <div className="p-3 bg-[#F7F5F1] border-t border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[11px] text-[#6B7280]">
                  {negociosParados.length} oportunidade(s) exigindo ação
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false)
                    navigate('/pipeline')
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#A8862B] hover:text-[#0A0A0A] hover:underline"
                >
                  <span>Abrir Pipeline</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo Aba 2: Notificações / Menções / Tarefas */}
          {abaAtiva === 'mensagens' && (
            <div className="max-h-80 overflow-y-auto divide-y divide-[#F7F5F1]">
              {nots.length === 0 ? (
                <p className="px-4 py-8 text-xs text-[#6B7280] text-center">
                  Nenhuma notificação interna pendente.
                </p>
              ) : (
                nots.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-2 hover:bg-[#F7F5F1] transition-colors ${
                      n.lida ? 'opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0A0A0A]">
                        {tipoLabel[n.tipo] || n.tipo}
                        {n.negocio_titulo && (
                          <span className="font-normal text-[#6B7280]"> · {n.negocio_titulo}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {new Date(n.created.replace(' ', 'T')).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {!n.lida && (
                      <button
                        type="button"
                        onClick={() => void marcarLida(n)}
                        className="text-[10px] border border-[#C9A227]/40 rounded px-2 py-1 font-semibold text-[#A8862B] hover:bg-[#C9A227] hover:text-[#0A0A0A] shrink-0"
                        title="Marcar como lida e abrir"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SinoNotificacoes
