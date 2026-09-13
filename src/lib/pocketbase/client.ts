import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Interceptor global para tratar 401 (sessão expirada / token inválido)
// Limpa autenticação no localStorage e redireciona para "/" com feedback claro.
pb.afterSend = (response, data) => {
  if (response.status === 401) {
    // Não redirecionar se o 401 foi na própria tentativa de login (/api/collections/users/auth-with-password)
    // ou se já estiver em rota pública de formulário / entrada
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isPublicRoute =
      currentPath === '/' || currentPath.startsWith('/formulario/') || currentPath === '/entrada'

    // Limpa a credencial do PocketBase (local storage e memória)
    pb.authStore.clear()

    // Se estiver em rota autenticada e a sessão falhou com 401, redireciona para o login
    if (typeof window !== 'undefined' && !isPublicRoute) {
      // Redireciona com parâmetro de sessão expirada para exibir o aviso amigável
      window.location.href = '/?sessao=expirada'
    }
  }

  return data
}

export default pb
