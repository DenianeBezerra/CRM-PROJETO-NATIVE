import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="text-center px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C9A227]/30 bg-[#141414] text-xs font-semibold text-[#E8C766] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          Vibratto CRM
        </div>
        <h1 className="font-playfair text-6xl font-bold mb-3 text-[#E8C766]">404</h1>
        <p className="text-lg text-white/80 mb-2">Página não encontrada</p>
        <p className="text-sm text-neutral-400 mb-8">
          O endereço <span className="font-mono text-[#E8C766]/80">{location.pathname}</span> não
          existe ou foi movido.
        </p>
        <a
          href="/home"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-inter font-semibold text-sm text-[#0A0A0A] bg-gradient-to-r from-[#E8C766] via-[#C9A227] to-[#B8860B] hover:from-[#F0D57F] hover:via-[#D8AF33] hover:to-[#B8860B] transition-all shadow-[0_4px_14px_0_rgba(201,162,39,0.38)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </a>
      </div>
    </div>
  )
}

export default NotFound
