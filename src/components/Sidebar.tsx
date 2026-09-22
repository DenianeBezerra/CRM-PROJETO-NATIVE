import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  TrendingUp,
  Target,
  LayoutGrid,
  Users,
  Search,
  Sun,
  CalendarCheck,
  FileText,
  Crown,
  BarChart3,
  PenTool,
  Calendar,
  Layers,
  ClipboardList,
  BookOpen,
  Eye,
  Building2,
  Upload,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { LOGO_WHITE } from '@/assets/logo'

type Item = { to: string; label: string; icon: React.ElementType; end?: boolean }
type Section = { titulo: string; itens: Item[] }

const SECOES: Section[] = [
  {
    titulo: 'Comercial',
    itens: [
      { to: '/home', label: 'Home', icon: Home, end: true },
      { to: '/pipeline', label: 'Pipeline', icon: TrendingUp },
      { to: '/oportunidades', label: 'Oportunidades', icon: Target },
      { to: '/kanban', label: 'Kanban', icon: LayoutGrid },
      { to: '/contatos', label: 'Contatos', icon: Users, end: true },
      { to: '/busca', label: 'Busca', icon: Search },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { to: '/meu-dia', label: 'Meu dia', icon: Sun },
      { to: '/operacao-dia', label: 'Operação do dia', icon: CalendarCheck },
      { to: '/ficha-operacional', label: 'Ficha operacional', icon: FileText },
      { to: '/painel-direcao', label: 'Painel de direção', icon: Crown },
      { to: '/dashboard', label: 'Dashboard comercial', icon: BarChart3 },
    ],
  },
  {
    titulo: 'Conteúdo',
    itens: [
      { to: '/conteudos', label: 'Conteúdos', icon: PenTool, end: true },
      { to: '/conteudos/agenda', label: 'Agenda editorial', icon: Calendar },
    ],
  },
]

const SECOES_ADMIN: Section[] = [
  {
    titulo: 'Administração',
    itens: [
      { to: '/admin/etapas', label: 'Etapas comerciais', icon: Layers },
      { to: '/admin/qualificacao', label: 'Qualificação', icon: ClipboardList },
      { to: '/admin/dicionario', label: 'Dicionário de métricas', icon: BookOpen },
      { to: '/visao-coordenacao', label: 'Visão de coordenação', icon: Eye },
      { to: '/implantacoes', label: 'Implantações', icon: Building2 },
      { to: '/relatorios', label: 'Relatórios agendados', icon: FileText },
      { to: '/importador', label: 'Importador', icon: Upload },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    toast({ title: 'Sessão encerrada', description: 'Você saiu da sua conta com segurança.' })
    navigate('/')
  }

  const renderSection = (secao: Section) => (
    <div key={secao.titulo} className="mb-5">
      <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A227]/70">
        {secao.titulo}
      </p>
      <nav className="space-y-0.5">
        {secao.itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#C9A227] text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-[#0A0A0A] border-r border-[#C9A227]/25 overflow-y-auto z-40">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#C9A227]/20">
        <img src={LOGO_WHITE} alt="Vibratto BPO Financeiro" className="h-7 w-auto" />
        <div className="flex flex-col leading-tight">
          <span className="font-playfair text-base font-bold text-white">
            Vibratto <span className="text-[#E8C766]">CRM</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#C9A227] font-semibold">
            Enterprise
          </span>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex-1 px-2 py-4">
        {SECOES.map(renderSection)}
        {isAdmin && SECOES_ADMIN.map(renderSection)}
      </div>

      {/* Rodapé: usuário + sair */}
      <div className="px-3 py-3 border-t border-[#C9A227]/20">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
            <p className="text-[11px] text-[#E8C766]/70 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Encerrar sessão"
            aria-label="Encerrar sessão"
            className="p-2 rounded-lg text-neutral-400 hover:text-[#E8C766] hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
