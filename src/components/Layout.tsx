import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

// Layout raiz: sidebar fixa nas telas autenticadas; páginas públicas
// (login, formulário por token, entrada pública) renderizam sem sidebar.
export default function Layout() {
  const location = useLocation()
  const isPublica =
    location.pathname === '/' ||
    location.pathname === '/entrada' ||
    location.pathname.startsWith('/formulario/')

  if (isPublica) {
    return (
      <main className="flex flex-col min-h-screen w-full bg-[#0A0A0A]">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F7F5F1]">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
