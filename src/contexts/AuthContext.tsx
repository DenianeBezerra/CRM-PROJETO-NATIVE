import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { AuthRecord } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export type UserRole = 'admin' | 'operator'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  created?: string
  updated?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isValid: boolean
  isLoading: boolean
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  logout: () => void
  validateSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapAuthRecord(record: AuthRecord | null): AuthUser | null {
  if (!record) return null
  return {
    id: record.id,
    email: record.email || '',
    name: record.name || (record.email ? record.email.split('@')[0] : 'Usuário'),
    role: record.role === 'admin' ? 'admin' : 'operator',
    avatar: record.avatar,
    created: record.created,
    updated: record.updated,
  }
}

/**
 * Lê o campo `exp` (timestamp em segundos) do payload JWT sem biblioteca externa.
 * Retorna null se não for possível decodificar.
 */
function getTokenExpiryMs(token: string | null): number | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    // Corrige base64url para base64 padrão
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    const payload = JSON.parse(decoded) as { exp?: number }
    if (typeof payload.exp === 'number' && payload.exp > 0) {
      return payload.exp * 1000
    }
  } catch {
    // ignora erros de decodificação
  }
  return null
}

function redirecionarParaLoginExpirado() {
  if (typeof window === 'undefined') return
  const pathname = window.location.pathname
  const isPublic =
    pathname === '/' || pathname.startsWith('/formulario/') || pathname === '/entrada'
  if (!isPublic && !window.location.search.includes('sessao=expirada')) {
    window.location.href = '/?sessao=expirada'
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return pb.authStore.isValid ? mapAuthRecord(pb.authStore.record) : null
  })
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [isValid, setIsValid] = useState<boolean>(pb.authStore.isValid)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Controle de concorrência e agendamento de refresh
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)
  const refreshTimeoutRef = useRef<number | null>(null)
  const lastRefreshAtRef = useRef<number>(0)

  const handleSessionExpired = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    pb.authStore.clear()
    setUser(null)
    setToken(null)
    setIsValid(false)
    redirecionarParaLoginExpirado()
  }, [])

  /**
   * Executa a renovação do token via PocketBase sem disparar refreshes concorrentes nem loops.
   */
  const performRefresh = useCallback(
    async (isManualTrigger = false): Promise<boolean> => {
      // Se já houver um refresh em andamento, retorna a mesma promise (deduplicação)
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current
      }

      if (!pb.authStore.isValid || !pb.authStore.token) {
        if (isValid) setIsValid(false)
        if (user) setUser(null)
        return false
      }

      // Throttle simples para evitar chamadas redundantes (< 30s de intervalo)
      const now = Date.now()
      if (!isManualTrigger && now - lastRefreshAtRef.current < 30_000) {
        return true
      }

      const p = (async () => {
        try {
          const refreshed = await pb.collection('users').authRefresh()
          lastRefreshAtRef.current = Date.now()
          const mapped = mapAuthRecord(refreshed.record)
          setUser(mapped)
          setToken(refreshed.token)
          setIsValid(true)
          return true
        } catch {
          handleSessionExpired()
          return false
        } finally {
          refreshPromiseRef.current = null
        }
      })()

      refreshPromiseRef.current = p
      return p
    },
    [isValid, user, handleSessionExpired],
  )

  /**
   * Agenda a próxima renovação periódica:
   * Calcula quando o token vai expirar (ex: 2 minutos antes do `exp`), ou a cada ~10 minutos.
   */
  const scheduleNextRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    if (!pb.authStore.isValid || !pb.authStore.token) return

    const TEN_MIN_MS = 10 * 60 * 1000
    const TWO_MIN_MS = 2 * 60 * 1000
    const expMs = getTokenExpiryMs(pb.authStore.token)
    let delayMs = TEN_MIN_MS

    if (expMs) {
      const remainingMs = expMs - Date.now()
      if (remainingMs <= TWO_MIN_MS) {
        // Se já está prestes a expirar, renova imediatamente
        delayMs = 1000
      } else {
        // Agenda para 2 minutos antes do fim ou 10 minutos (o menor dos dois)
        delayMs = Math.min(TEN_MIN_MS, remainingMs - TWO_MIN_MS)
      }
    }

    // Garante mínimo de 5s para evitar flood
    const safeDelay = Math.max(5000, delayMs)

    refreshTimeoutRef.current = window.setTimeout(() => {
      void performRefresh(false).then((ok) => {
        if (ok) {
          scheduleNextRefresh()
        }
      })
    }, safeDelay)
  }, [performRefresh])

  useEffect(() => {
    // Sync initial state
    setUser(pb.authStore.isValid ? mapAuthRecord(pb.authStore.record) : null)
    setToken(pb.authStore.token || null)
    setIsValid(pb.authStore.isValid)
    setIsLoading(false)

    // Listen to changes in auth store
    const unsubscribe = pb.authStore.onChange((newToken, newRecord) => {
      setToken(newToken || null)
      setUser(newRecord ? mapAuthRecord(newRecord) : null)
      setIsValid(pb.authStore.isValid)
      if (pb.authStore.isValid && newToken) {
        scheduleNextRefresh()
      } else {
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current)
          refreshTimeoutRef.current = null
        }
      }
    })

    // Tenta refresh / validação rápida se já constar autenticado localmente
    if (pb.authStore.isValid && pb.authStore.token) {
      void performRefresh(false).then((ok) => {
        if (ok) scheduleNextRefresh()
      })
    }

    // Renovação proativa ao retornar o foco da aba (visibilitychange / focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pb.authStore.isValid && pb.authStore.token) {
        const expMs = getTokenExpiryMs(pb.authStore.token)
        const now = Date.now()
        // Se já passou mais de 5 minutos desde o último refresh ou restam menos de 5 min para expirar
        const timeSinceLast = now - lastRefreshAtRef.current
        const timeUntilExp = expMs ? expMs - now : Infinity
        if (timeSinceLast > 5 * 60 * 1000 || timeUntilExp < 5 * 60 * 1000) {
          void performRefresh(false).then((ok) => {
            if (ok) scheduleNextRefresh()
          })
        }
      }
    }

    const handleWindowFocus = () => {
      handleVisibilityChange()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [performRefresh, scheduleNextRefresh])

  const validateSession = async (): Promise<boolean> => {
    return performRefresh(true)
  }

  const login = async (email: string, pass: string) => {
    const trimmedEmail = email.trim()

    try {
      const authData = await pb.collection('users').authWithPassword(trimmedEmail, pass)
      const mapped = mapAuthRecord(authData.record)
      setUser(mapped)
      setToken(authData.token)
      setIsValid(true)
      return { success: true, user: mapped || undefined }
    } catch (err: unknown) {
      let message = 'E-mail ou senha incorretos.'

      if (err && typeof err === 'object') {
        const anyErr = err as {
          response?: { message?: string; data?: Record<string, { message?: string }> }
          message?: string
        }

        if (anyErr.response?.data) {
          const fieldErrors = Object.entries(anyErr.response.data)
            .map(([field, details]) => {
              const fieldName =
                field === 'identity' || field === 'email'
                  ? 'E-mail'
                  : field === 'password'
                    ? 'Senha'
                    : field
              return `${fieldName}: ${details.message || 'Inválido'}`
            })
            .join(' | ')
          if (fieldErrors) {
            message = fieldErrors
          }
        } else if (anyErr.response?.message) {
          message =
            anyErr.response.message === 'Failed to authenticate.'
              ? 'E-mail ou senha inválidos.'
              : anyErr.response.message
        } else if (anyErr.message) {
          message = anyErr.message
        }
      }

      return { success: false, error: message }
    }
  }

  const logout = () => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    pb.authStore.clear()
    setUser(null)
    setToken(null)
    setIsValid(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isValid, isLoading, login, logout, validateSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
