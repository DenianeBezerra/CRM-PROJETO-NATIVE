import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, User, TrendingUp, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

// M-19 (CEO 13/09) — Busca global acessível de qualquer tela.
// Um campo, três destinos: contato, oportunidade. Abre com "/" ou Ctrl+K,
// fecha com Esc, navegação por clique. Resultados mínimos por tipo.
type ClienteHit = { id: string; nome: string; email: string; empresa: string }
type OportunidadeHit = {
  id: string
  titulo: string
  cliente: string
  estagio: string
  status: string
  valor: number
}
type Resp = { total: number; clientes: ClienteHit[]; oportunidades: OportunidadeHit[] }

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function BuscaGlobal() {
  const navigate = useNavigate()
  const [aberta, setAberta] = useState(false)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' && !aberta) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        const alvo = e.target as HTMLElement
        const digitando =
          alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable
        if (e.key === '/' && digitando) return
        e.preventDefault()
        setAberta(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setAberta(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberta])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberta(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!aberta || q.trim().length < 2) {
      setRes(null)
      setErro('')
      return
    }
    let vivo = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await pb.send<Resp>(
          `/backend/v1/busca-global?q=${encodeURIComponent(q.trim())}`,
          {},
        )
        if (vivo) {
          setRes(r)
          setErro('')
        }
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        if (vivo) setErro(err?.response?.data?.error || err?.message || 'Falha na busca.')
      } finally {
        if (vivo) setLoading(false)
      }
    }, 250)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [q, aberta])

  const ir = (destino: string) => {
    setAberta(false)
    setQ('')
    setRes(null)
    navigate(destino)
  }

  if (!aberta) {
    return (
      <button
        onClick={() => {
          setAberta(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-[#C9A227]/40 bg-[#141414] px-3 py-1.5 text-xs text-white/70 hover:text-white hover:border-[#C9A227] transition-colors"
        title="Buscar (atalho: /)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="hidden sm:inline text-[10px] border border-white/20 rounded px-1">/</kbd>
      </button>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[#C9A227] bg-[#141414] px-3 py-1.5">
        <Search className="w-3.5 h-3.5 text-[#C9A227]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar contato ou oportunidade…"
          className="bg-transparent outline-none text-sm text-white placeholder:text-white/40 w-56 sm:w-72"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-[#C9A227] animate-spin" />}
        <button onClick={() => setAberta(false)} title="Fechar (Esc)">
          <X className="w-3.5 h-3.5 text-white/50 hover:text-white" />
        </button>
      </div>

      {(res || erro) && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] max-h-96 overflow-y-auto bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50">
          {erro && <p className="p-3 text-sm text-red-700">{erro}</p>}
          {res && res.total === 0 && !erro && (
            <p className="p-4 text-sm text-[#6B7280]">Nada encontrado para “{q.trim()}”.</p>
          )}
          {res && res.clientes.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Contatos
              </p>
              {res.clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => ir('/contatos')}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#F7F5F1] flex items-start gap-2"
                >
                  <User className="w-4 h-4 text-[#A8862B] mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-[#0A0A0A]">{c.nome}</span>
                    <span className="block text-xs text-[#6B7280]">
                      {[c.empresa !== c.nome ? c.empresa : '', c.email]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {res && res.oportunidades.length > 0 && (
            <div className="p-2 border-t border-[#F3F4F6]">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Oportunidades
              </p>
              {res.oportunidades.map((o) => (
                <button
                  key={o.id}
                  onClick={() => ir(`/oportunidades`)}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#F7F5F1] flex items-start gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-[#A8862B] mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-[#0A0A0A]">{o.titulo}</span>
                    <span className="block text-xs text-[#6B7280]">
                      {[o.cliente, o.estagio, o.valor ? fmtBRL(o.valor) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
