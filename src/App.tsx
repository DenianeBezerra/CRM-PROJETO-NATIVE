import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Index from './pages/Index'
import Home from './pages/Home'
import Contacts from './pages/Contacts'
import Opportunities from './pages/Opportunities'
import Stages from './pages/Stages'
import Kanban from './pages/Kanban'
import SearchPage from './pages/SearchPage'
import Operacional from './pages/Operacional'
import Qualificacao from './pages/Qualificacao'
import Dicionario from './pages/Dicionario'
import DashboardComercial from './pages/DashboardComercial'
import FormularioPublico from './pages/FormularioPublico'
import EntradaPublica from './pages/EntradaPublica'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isValid, isLoading } = useAuth()
  if (isLoading)
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A] text-white">
        <p className="text-sm font-medium text-[#E8C766]">Verificando credenciais...</p>
      </div>
    )
  if (!isValid) return <Navigate to="/" replace />
  return <>{children}</>
}
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isValid, isLoading } = useAuth()
  if (isLoading) return null
  if (!isValid) return <Navigate to="/" replace />
  if (user?.role !== 'admin') return <Navigate to="/home" replace />
  return <>{children}</>
}
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contatos"
              element={
                <ProtectedRoute>
                  <Contacts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/oportunidades"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kanban"
              element={
                <ProtectedRoute>
                  <Kanban />
                </ProtectedRoute>
              }
            />
            <Route
              path="/busca"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operacional"
              element={
                <ProtectedRoute>
                  <Operacional />
                </ProtectedRoute>
              }
            />
            <Route path="/painel" element={<Navigate to="/operacional" replace />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Home adminOnly />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/etapas"
              element={
                <AdminRoute>
                  <Stages />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/qualificacao"
              element={
                <AdminRoute>
                  <Qualificacao />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/dicionario"
              element={
                <AdminRoute>
                  <Dicionario />
                </AdminRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardComercial />
                </ProtectedRoute>
              }
            />
          </Route>
          {/* T3.02 — rota pública do formulário (sem login, por token) */}
          <Route path="/formulario/:token" element={<FormularioPublico />} />
          {/* T3.07 — Porta 1: formulário público de entrada (sem login) */}
          <Route path="/entrada" element={<EntradaPublica />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)
export default App
