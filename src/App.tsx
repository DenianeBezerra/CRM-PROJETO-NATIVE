import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Index from './pages/Index'
import Home from './pages/Home'
import Contacts from './pages/Contacts'
import Pipeline from './pages/Pipeline'
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
import MeuDia from './pages/MeuDia'
import OperacaoDia from './pages/OperacaoDia'
import PainelDirecao from './pages/PainelDirecao'
import FichaOperacional from './pages/FichaOperacional'
import VisaoCoordenacao from './pages/VisaoCoordenacao'
import Implantacoes from './pages/Implantacoes'
import Relatorios from './pages/Relatorios'
import Conteudos from './pages/Conteudos'
import AgendaEditorial from './pages/AgendaEditorial'
import Importador from './pages/Importador'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
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
    <ErrorBoundary>
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
                path="/pipeline"
                element={
                  <ProtectedRoute>
                    <Pipeline />
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
              <Route
                path="/meu-dia"
                element={
                  <ProtectedRoute>
                    <MeuDia />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/painel-direcao"
                element={
                  <ProtectedRoute>
                    <PainelDirecao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/operacao-dia"
                element={
                  <ProtectedRoute>
                    <OperacaoDia />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ficha-operacional"
                element={
                  <ProtectedRoute>
                    <FichaOperacional />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/visao-coordenacao"
                element={
                  <AdminRoute>
                    <VisaoCoordenacao />
                  </AdminRoute>
                }
              />
              <Route
                path="/implantacoes"
                element={
                  <AdminRoute>
                    <Implantacoes />
                  </AdminRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <AdminRoute>
                    <Relatorios />
                  </AdminRoute>
                }
              />
              <Route
                path="/importador"
                element={
                  <AdminRoute>
                    <Importador />
                  </AdminRoute>
                }
              />
              <Route
                path="/conteudos"
                element={
                  <ProtectedRoute>
                    <Conteudos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conteudos/agenda"
                element={
                  <ProtectedRoute>
                    <AgendaEditorial />
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
    </ErrorBoundary>
  </BrowserRouter>
)
export default App
