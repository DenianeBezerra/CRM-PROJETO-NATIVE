import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Sparkles,
  Users,
  Building2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Briefcase,
  ListTodo,
  Crown,
  ClipboardList,
  CalendarCheck,
  BarChart3,
  Rocket,
  Mail,
  PenTool,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { LOGO_WHITE } from '@/assets/logo'
import SinoNotificacoes from '@/components/SinoNotificacoes'
import { msgErro } from '@/lib/erro'

type Contadores = {
  operacao: { atrasadas: number; excecoes: number } | null
  meuDia: { atrasadas: number; tarefas: number; acoes: number } | null
}

export default function Home({ adminOnly = false }: { adminOnly?: boolean }) {
  const navigate = useNavigate()
  const { user, isValid, isLoading, logout, isAdmin } = useAuth()
  const { toast } = useToast()
  const [contadores, setContadores] = useState<Contadores>({ operacao: null, meuDia: null })

  useEffect(() => {
    // A-23: a tela de entrada diz onde está o problema — contadores de
    // pendências operacionais nos cartões (destaque visual quando > 0).
    let vivo = true
    const carregar = async () => {
      const r: Contadores = { operacao: null, meuDia: null }
      try {
        const op = await pb.send<{ atrasadas_efetivas?: number; excecoes_abertas?: number }>(
          '/backend/v1/visao/operacao-resumo',
          {},
        )
        r.operacao = { atrasadas: op.atrasadas_efetivas || 0, excecoes: op.excecoes_abertas || 0 }
      } catch {
        /* contador opcional — ausência não bloqueia a home */
      }
      try {
        const md = await pb.send<{
          obrigacoes_atrasadas?: unknown[]
          tarefas_abertas?: unknown[]
          acoes_vencidas?: unknown[]
        }>('/backend/v1/meu-dia', {})
        r.meuDia = {
          atrasadas: (md.obrigacoes_atrasadas || []).length,
          tarefas: (md.tarefas_abertas || []).length,
          acoes: (md.acoes_vencidas || []).length,
        }
      } catch {
        /* idem */
      }
      if (vivo) setContadores(r)
    }
    void carregar()
    return () => {
      vivo = false
    }
  }, [])

  const handleDeactivateDemoFixture = async () => {
    try {
      const fixture = await pb.collection('demo_fixtures').getFirstListItem("status = 'active'")
      const result = await pb.send(`/backend/v1/demo-fixtures/${fixture.id}/deactivate`, {
        method: 'POST',
      })
      toast({
        title: 'Fixture desativada',
        description: `Auditoria registrada: ${result.action || 'deactivated'}.`,
      })
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number; message?: string } }).response
          : undefined
      const detail =
        response?.status === 404
          ? 'Nenhuma fixture ativa foi encontrada no catálogo.'
          : response?.message ||
            (err instanceof Error ? err.message : 'Nenhuma alteração foi aplicada.')
      toast({ title: 'Desativação não realizada', description: detail })
    }
  }

  useEffect(() => {
    if (!isLoading && !isValid) {
      navigate('/', { replace: true })
    }
  }, [isValid, isLoading, navigate])

  const handleLogout = () => {
    logout()
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu da sua conta com segurança.',
    })
    navigate('/')
  }

  if (isLoading || !isValid) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#E8C766]">Carregando sessão...</p>
        </div>
      </div>
    )
  }

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Deniane')
  // A-23: badge de pendência — só aparece quando há problema (> 0).
  const badge = (n: number) =>
    n > 0 ? (
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold ml-1">
        {n}
      </span>
    ) : null
  const opAtrasadas = contadores.operacao?.atrasadas ?? 0
  const opExcecoes = contadores.operacao?.excecoes ?? 0
  const mdPend =
    (contadores.meuDia?.atrasadas ?? 0) +
    (contadores.meuDia?.tarefas ?? 0) +
    (contadores.meuDia?.acoes ?? 0)
  // A-22: um nome por destino em todo o sistema.
  const nomeDestino: Record<string, string> = {
    '/dashboard': 'Dashboard comercial',
    '/oportunidades': 'Oportunidades',
    '/contatos': 'Contatos',
    '/operacional': 'Operação do dia',
  }
  const rotulo = (path: string) => nomeDestino[path] || path

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F1] text-[#0A0A0A]">
      {/* ========================================================= */}
      {/* TOP BAR: Logo, User Badge, Logout CTA */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        {/* Left: Brand / Wordmark */}
        <div className="flex items-center gap-3">
          <img src={LOGO_WHITE} alt="Vibratto BPO Financeiro" className="h-8 w-auto" />
          <div className="h-6 w-[1px] bg-[#C9A227]/40" />
          <div className="flex flex-col">
            <span className="font-playfair text-lg sm:text-xl font-bold tracking-tight text-white">
              Vibratto <span className="text-[#E8C766]">CRM</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#C9A227] font-semibold">
              Enterprise
            </span>
          </div>
        </div>

        {/* Right: Notifications, User Email & Logout */}
        <div className="flex items-center gap-3 sm:gap-5">
          <SinoNotificacoes />
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{displayName}</span>
            <span className="text-[11px] text-[#E8C766]/80">{user?.email}</span>
          </div>

          <div className="h-6 w-[1px] bg-[#C9A227]/30 hidden sm:block" />

          {adminOnly && user?.role === 'admin' && (
            <button
              onClick={handleDeactivateDemoFixture}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#B91C1C]/40 bg-white text-[#B91C1C] font-medium text-xs sm:text-sm"
            >
              Desativar fixture
            </button>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-[#C9A227]/40 bg-[#141414] hover:bg-[#C9A227] text-white hover:text-[#0A0A0A] font-inter font-medium text-xs sm:text-sm transition-all duration-200 shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTENT CANVAS */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 lg:p-12 flex flex-col justify-center">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-sm relative overflow-hidden">
          {/* Top Gold Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E8C766] via-[#C9A227] to-[#A8862B]" />

          {/* Watermark in corner */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-[0.03] text-[#0A0A0A]">
            <Sparkles className="w-72 h-72" />
          </div>

          {/* Heading Section */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F5F1] border border-[#C9A227]/30 text-xs font-semibold text-[#A8862B] mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A227]" />
              {adminOnly ? 'Área protegida' : 'Sessão corporativa ativa'}
            </div>

            <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A0A0A] tracking-tight">
              Olá, {displayName}
            </h1>

            {/* Gold Accent Line */}
            <div className="h-1 w-20 bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full mt-3 mb-4" />

            <p className="font-inter text-base sm:text-lg text-[#6B7280] leading-relaxed">
              <span>
                Sua central de gestão está ativa: operação, comercial, conteúdo e cadastro em um só
                lugar.{' '}
              </span>
              {adminOnly && user?.role === 'admin' ? (
                <>
                  <button
                    onClick={() => navigate('/admin/etapas')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    Etapas comerciais
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/admin/qualificacao')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    Qualificação
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/admin/dicionario')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    Dicionário de métricas
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/oportunidades')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    {rotulo('/oportunidades')}
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/contatos')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    {rotulo('/contatos')}
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/operacional')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    {rotulo('/operacional')}
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    {rotulo('/dashboard')}
                  </button>{' '}
                  ·{' '}
                  <button
                    onClick={() => navigate('/ficha-operacional')}
                    className="font-semibold text-[#A8862B] underline"
                  >
                    Ficha operacional
                  </button>
                </>
              )}{' '}
            </p>
          </div>

          {/* Highlights & Modules Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-10 pt-8 border-t border-[#E5E7EB]">
            {/* Card 0: Painel de Direção — camada CEO (T3.10, admin) */}
            {isAdmin && (
              <button
                onClick={() => navigate('/painel-direcao')}
                className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <Crown className="w-5 h-5" />
                </div>
                <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                  Painel de Direção
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  KPIs do negócio com meta e variação vs. período anterior.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                  Abrir painel de direção →
                </span>
              </button>
            )}

            {/* Card: Visão de coordenação (T3.15 — admin) */}
            {isAdmin && (
              <button
                onClick={() => navigate('/visao-coordenacao')}
                className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                  Visão de coordenação{badge(opExcecoes)}
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Matriz de clientes por obrigação, exceções por analista e carga do time.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                  Abrir visão de coordenação →
                </span>
              </button>
            )}

            {/* Card: Relatórios agendados (T3.19 — admin) */}
            {isAdmin && (
              <button
                onClick={() => navigate('/relatorios')}
                className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                  Relatórios agendados
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  O resumo da direção chega por e-mail no dia e hora combinados.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                  Abrir relatórios →
                </span>
              </button>
            )}

            {/* Card: Implantações (T3.16 — admin) */}
            {isAdmin && (
              <button
                onClick={() => navigate('/implantacoes')}
                className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                  <Rocket className="w-5 h-5" />
                </div>
                <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">Implantações</h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Projeto de entrada do cliente em 7 etapas — conclusão condicionada à ficha
                  completa.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                  Abrir implantações →
                </span>
              </button>
            )}

            {/* M-21: telas de trabalho diário primeiro — Meu dia e Operação do dia. */}
            {/* Card: Meu dia — fila pessoal (T3.08) */}
            <button
              onClick={() => navigate('/meu-dia')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <ListTodo className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Meu dia{badge(mdPend)}
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Tarefas, ações vencidas e menções atribuídas a você.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir meu dia →
              </span>
            </button>

            {/* Card: Operação do dia (T3.13) */}
            <button
              onClick={() => navigate('/operacao-dia')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Operação do dia{badge(opAtrasadas + opExcecoes)}
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Rotinas do dia geradas pela ficha operacional — atrasos, exceções e baixa em 1
                toque.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir operação do dia →
              </span>
            </button>

            {/* Card 1: Pipeline — clicável, leva para Oportunidades */}
            <button
              onClick={() => navigate('/oportunidades')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Pipeline Comercial
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Gestão de oportunidades e estágios de negociação em tempo real.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir oportunidades →
              </span>
            </button>

            {/* Card 2: Clientes — clicável, leva para Contatos */}
            <button
              onClick={() => navigate('/contatos')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">Base de Contatos</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Histórico unificado de interações, propostas e contratos.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir contatos →
              </span>
            </button>

            {/* Card: Ficha Operacional (T3.11) */}
            <button
              onClick={() => navigate('/ficha-operacional')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Ficha Operacional
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Rotina padronizada por cliente — gera o procedimento operacional do time.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir ficha operacional →
              </span>
            </button>

            {/* Card: Módulo de Conteúdo (T3.21) */}
            <button
              onClick={() => navigate('/conteudos')}
              className="text-left p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/60 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <PenTool className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">Conteúdo</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Agenda editorial, aprovação e pacote de publicação — do tema ao link rastreável.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A8862B] mt-3">
                Abrir conteúdo →
              </span>
            </button>

            {/* B-22 (decisão CEO 16/09): cartão OCULTO até a página própria existir —
                link provisório para /contatos reintroduzia dois cartões com nomes
                diferentes para o mesmo destino (o problema que o A-22 resolveu).
                O card volta quando a página Contas & Empresas for construída. */}
          </div>

          {/* System Status Footer */}
          <div className="mt-8 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              <span>Conexão segura</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Sessão segura ativa
              </span>{' '}
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                Vibratto CRM v2.4
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
