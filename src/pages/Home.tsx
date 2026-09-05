import React, { useEffect } from 'react'
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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Home({ adminOnly = false }: { adminOnly?: boolean }) {
  const navigate = useNavigate()
  const { user, isValid, isLoading, logout } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading && !isValid) {
      navigate('/', { replace: true })
    }
  }, [isValid, isLoading, navigate])

  const handleDeactivateDemo = async () => {
    if (!user || user.role !== 'admin') return
    try {
      const fixture = await pb
        .collection('users')
        .getFirstListItem('email = "operador.demo@vibratto.com.br"')
      await pb.send(`/backend/v1/demo/deactivate-fixture/${fixture.id}`, { method: 'POST' })
      toast({
        title: 'Fixture desativada',
        description: 'A ação foi registrada na trilha de auditoria.',
      })
    } catch {
      toast({
        title: 'Não foi possível desativar',
        description: 'Nenhuma alteração foi aplicada.',
        variant: 'destructive',
      })
    }
  }

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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F1] text-[#0A0A0A]">
      {/* ========================================================= */}
      {/* TOP BAR: Logo, User Badge, Logout CTA */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        {/* Left: Brand / Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-[#C9A227]/40 bg-gradient-to-br from-[#141414] to-[#0A0A0A] flex items-center justify-center shadow-[0_0_10px_rgba(201,162,39,0.2)]">
            <Sparkles className="w-4 h-4 text-[#E8C766]" />
          </div>
          <div className="flex flex-col">
            <span className="font-playfair text-lg sm:text-xl font-bold tracking-tight text-white">
              Vibratto <span className="text-[#E8C766]">CRM</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#C9A227] font-semibold">
              Enterprise
            </span>
          </div>
        </div>

        {/* Right: User Email & Logout */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{displayName}</span>
            <span className="text-[11px] text-[#E8C766]/80">{user?.email}</span>
          </div>

          <div className="h-6 w-[1px] bg-[#C9A227]/30 hidden sm:block" />

          {adminOnly && user?.role === 'admin' && (
            <button
              onClick={handleDeactivateDemo}
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
              {adminOnly ? 'Área administrativa protegida' : 'Sessão corporativa ativa'}
            </div>

            <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A0A0A] tracking-tight">
              Olá, {displayName}
            </h1>

            {/* Gold Accent Line */}
            <div className="h-1 w-20 bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full mt-3 mb-4" />

            <p className="font-inter text-base sm:text-lg text-[#6B7280] leading-relaxed">
              {adminOnly
                ? `Acesso administrativo confirmado para o perfil ${user?.role || 'admin'}.`
                : 'Seu CRM está pronto. Em breve, seus clientes aparecerão aqui.'}
            </p>
          </div>

          {/* Highlights & Modules Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-10 pt-8 border-t border-[#E5E7EB]">
            {/* Card 1: Pipeline */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Pipeline Comercial
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Gestão de oportunidades e estágios de negociação em tempo real.
              </p>
            </div>

            {/* Card 2: Clientes */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">Base de Contatos</h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Histórico unificado de interações, propostas e contratos.
              </p>
            </div>

            {/* Card 3: Contas Corporativas */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F7F5F1] border border-[#E5E7EB] hover:border-[#C9A227]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-playfair font-bold text-base text-[#0A0A0A]">
                Contas & Empresas
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Segmentação executiva de carteiras e tomadores de decisão.
              </p>
            </div>
          </div>

          {/* System Status Footer */}
          <div className="mt-8 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              <span>Conexão criptografada de ponta a ponta</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                PocketBase Auth: Ativo
              </span>
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
