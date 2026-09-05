import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Index from './pages/Index'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

// Protected Route Component to ensure unauthenticated users are redirected to /
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isValid, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#E8C766]">Verificando credenciais...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isValid, isLoading } = useAuth()

  if (isLoading) return null
  if (!isValid) return <Navigate to="/" replace />
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
              path="/admin"
              element={
                <AdminRoute>
                  <Home adminOnly />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
