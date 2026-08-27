import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, Sparkles, KeyRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const navigate = useNavigate()
  const { login, isValid, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  // If already authenticated, redirect to /home
  useEffect(() => {
    if (!authLoading && isValid) {
      navigate('/home', { replace: true })
    }
  }, [isValid, authLoading, navigate])

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = 'Informe seu e-mail corporativo.'
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errors.email = 'Formato de e-mail inválido.'
    }

    if (!password) {
      errors.password = 'Informe sua senha de acesso.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        toast({
          title: 'Autenticado com sucesso',
          description: 'Acessando o ecossistema Vibratto CRM...',
          className: 'border-[#C9A227]/40 bg-[#141414] text-white',
        })
        navigate('/home')
      } else {
        setErrorMessage(result.error || 'E-mail ou senha incorretos.')
        setPassword('') // Clear password field on error
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao tentar conectar. Tente novamente.')
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    toast({
      title: 'Recuperação de Senha',
      description:
        'A redefinição de credenciais é gerenciada pelo administrador da sua organização.',
      className: 'border-[#C9A227] bg-[#0A0A0A] text-[#F7F5F1]',
    })
  }

  const handleContactAdmin = (e: React.MouseEvent) => {
    e.preventDefault()
    toast({
      title: 'Acesso Corporativo',
      description: 'Entre em contato com o suporte ou gestor de TI em suporte@vibratto.com.br.',
      className: 'border-[#C9A227] bg-[#0A0A0A] text-[#F7F5F1]',
    })
  }

  const fillDemoCredentials = () => {
    setEmail('deniane@vibratto.com.br')
    setPassword('Skip@Pass')
    setFieldErrors({})
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0A0A0A] text-foreground selection:bg-[#C9A227]/30 selection:text-white transition-opacity duration-300">
      {/* ========================================================= */}
      {/* PAINEL ESQUERDO (55% desktop): Branding, Luxury Gold/Dark */}
      {/* ========================================================= */}
      <section
        className="relative lg:w-[55%] w-full min-h-[280px] sm:min-h-[340px] lg:min-h-screen bg-[#0A0A0A] bg-diagonal-lines flex flex-col justify-between p-6 sm:p-10 lg:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#C9A227]/20"
        aria-label="Painel Institucional Vibratto CRM"
      >
        {/* Subtle pulsing gold radial glow in background */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[480px] lg:w-[650px] h-[320px] sm:h-[480px] lg:h-[650px] rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.18)_0%,rgba(168,134,43,0.06)_45%,transparent_70%)] animate-gold-pulse blur-2xl"
          aria-hidden="true"
        />

        {/* Top Gold Corner Accent */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#C9A227] animate-ping" />
            <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase font-semibold text-[#E8C766]/80">
              Ambiente Seguro
            </span>
          </div>

          {/* Quick demo filler helper */}
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#C9A227]/30 bg-[#141414]/70 hover:bg-[#C9A227]/10 hover:border-[#C9A227] transition-all duration-200 text-[11px] text-[#E8C766] cursor-pointer"
            title="Preencher com credenciais de demonstração (Deniane)"
          >
            <KeyRound className="w-3 h-3 text-[#C9A227] group-hover:rotate-45 transition-transform" />
            <span>Preencher Demonstração</span>
          </button>
        </div>

        {/* Center Hero Block with Geometric Gold Motifs */}
        <div className="relative z-10 my-auto py-6 sm:py-10 max-w-xl mx-auto lg:mx-0">
          {/* Decorative geometric frame behind text */}
          <div
            className="pointer-events-none absolute -inset-6 sm:-inset-10 border border-[#C9A227]/15 rounded-2xl rotate-1 hidden sm:block"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -inset-6 sm:-inset-10 border border-[#C9A227]/10 rounded-2xl -rotate-1 hidden sm:block"
            aria-hidden="true"
          />

          {/* Logo / Wordmark with Hover expanding underline */}
          <div className="inline-block group cursor-default">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg border border-[#C9A227]/40 bg-gradient-to-br from-[#141414] to-[#0A0A0A] flex items-center justify-center shadow-[0_0_15px_rgba(201,162,39,0.25)]">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8C766]" />
              </div>
              <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Vibratto <span className="text-[#E8C766] font-semibold">CRM</span>
              </h1>
            </div>

            {/* Underline expanding from center */}
            <div className="mt-3 relative h-[2px] w-full bg-[#C9A227]/25 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-[#E8C766] via-[#C9A227] to-[#A8862B] transform scale-x-75 group-hover:scale-x-100 transition-transform duration-300 origin-center ease-out" />
            </div>
          </div>

          {/* Tagline */}
          <p className="mt-6 sm:mt-8 font-inter text-base sm:text-xl lg:text-2xl text-white/90 font-light leading-relaxed">
            Gestão de relacionamento com{' '}
            <span className="font-playfair font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#FBF2D5] via-[#E8C766] to-[#C9A227] italic">
              excelência.
            </span>
          </p>

          <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-normal max-w-md">
            Plataforma corporativa dedicada a negociações de alto padrão, inteligência de pipeline e
            fidelização de clientes.
          </p>
        </div>

        {/* Bottom Trust Line */}
        <div className="relative z-10 pt-4 border-t border-[#C9A227]/15 flex items-center justify-between text-xs text-[#E8C766]/80 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
            <span className="tracking-wider">Seguro • Confiável • Profissional</span>
          </div>
          <span className="hidden sm:inline text-neutral-500 text-[11px]">v2.4 Enterprise</span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PAINEL DIREITO (45% desktop): Form Card, Clean White Base */}
      {/* ========================================================= */}
      <section
        className="relative lg:w-[45%] w-full min-h-[calc(100vh-280px)] lg:min-h-screen bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16"
        aria-label="Formulário de Acesso"
      >
        <div className="w-full max-w-md mx-auto">
          {/* Form Header (Stagger 1) */}
          <div className="animate-fade-in-up stagger-1 mb-8">
            <div className="inline-block">
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#0A0A0A] tracking-tight">
                Bem-vindo(a) de volta
              </h2>
              <div className="h-1 w-12 bg-gradient-to-r from-[#C9A227] to-[#E8C766] rounded-full mt-2" />
            </div>
            <p className="font-inter text-sm sm:text-base text-[#6B7280] mt-2">
              Acesse sua conta para continuar.
            </p>
          </div>

          {/* Inline Error Box */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg bg-[#FEE2E2] border border-[#B91C1C]/30 text-[#B91C1C] text-sm flex items-start gap-3 animate-fade-in"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
              <div className="flex-1 font-medium">
                <span className="font-semibold block">Falha de autenticação</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Field: Email (Stagger 2) */}
            <div className="animate-fade-in-up stagger-2 space-y-1.5">
              <label
                htmlFor="email-input"
                className="block text-xs sm:text-sm font-semibold text-[#141414] tracking-wide"
              >
                E-mail
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }
                  }}
                  placeholder="voce@empresa.com"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg bg-[#F7F5F1] text-[#0A0A0A] placeholder:text-[#6B7280]/60 border transition-all duration-200 text-sm sm:text-base focus:bg-white focus:outline-none ${
                    fieldErrors.email
                      ? 'border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/20'
                      : 'border-[#E5E7EB] focus:border-[#C9A227] focus:ring-4 focus:ring-[#C9A227]/20 hover:border-[#C9A227]/50'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-[#B91C1C] font-medium mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Field: Senha (Stagger 3) */}
            <div className="animate-fade-in-up stagger-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password-input"
                  className="block text-xs sm:text-sm font-semibold text-[#141414] tracking-wide"
                >
                  Senha
                </label>
              </div>

              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
                    }
                  }}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className={`w-full pl-4 pr-11 py-3 rounded-lg bg-[#F7F5F1] text-[#0A0A0A] placeholder:text-[#6B7280]/60 border transition-all duration-200 text-sm sm:text-base focus:bg-white focus:outline-none ${
                    fieldErrors.password
                      ? 'border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/20'
                      : 'border-[#E5E7EB] focus:border-[#C9A227] focus:ring-4 focus:ring-[#C9A227]/20 hover:border-[#C9A227]/50'
                  }`}
                />

                {/* Toggle Password Visibility Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#6B7280] hover:text-[#0A0A0A] transition-colors focus:outline-none focus:text-[#C9A227]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                {fieldErrors.password ? (
                  <p className="text-xs text-[#B91C1C] font-medium">{fieldErrors.password}</p>
                ) : (
                  <span />
                )}

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs sm:text-sm font-semibold text-[#C9A227] hover:text-[#B8860B] hover:underline transition-colors focus:outline-none ml-auto"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            {/* Submit Button (Stagger 4) */}
            <div className="animate-fade-in-up stagger-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-lg font-inter font-bold text-base text-[#0A0A0A] bg-gradient-to-r from-[#E8C766] via-[#C9A227] to-[#B8860B] hover:from-[#F0D57F] hover:via-[#D8AF33] hover:to-[#B8860B] transition-all duration-200 ease-out shadow-[0_4px_14px_0_rgba(201,162,39,0.38)] hover:shadow-[0_6px_20px_0_rgba(201,162,39,0.55)] hover:-translate-y-0.5 active:translate-y-[1px] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#0A0A0A]" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Não possui acesso?{' '}
              <button
                type="button"
                onClick={handleContactAdmin}
                className="font-semibold text-[#C9A227] hover:text-[#B8860B] hover:underline transition-colors focus:outline-none"
              >
                Fale com o administrador.
              </button>
            </p>
          </div>

          {/* Quick Demo Help Badge */}
          <div className="mt-6 p-3 rounded-lg bg-[#F7F5F1] border border-[#E5E7EB] text-center">
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Usuário de demonstração:{' '}
              <strong className="text-[#0A0A0A]">deniane@vibratto.com.br</strong> / Senha:{' '}
              <strong className="text-[#0A0A0A]">Skip@Pass</strong>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
