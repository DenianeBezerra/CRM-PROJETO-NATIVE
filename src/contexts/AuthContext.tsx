import React, { createContext, useContext, useEffect, useState } from 'react'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapAuthRecord(record: AuthRecord | null): AuthUser | null {
  if (!record) return null
  return {
    id: record.id,
    email: record.email || '',
    name: record.name || (record.email ? record.email.split('@')[0] : 'Usuário'),
    role: record.role === 'operator' ? 'operator' : 'admin',
    avatar: record.avatar,
    created: record.created,
    updated: record.updated,
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return pb.authStore.isValid ? mapAuthRecord(pb.authStore.record) : null
  })
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [isValid, setIsValid] = useState<boolean>(pb.authStore.isValid)
  const [isLoading, setIsLoading] = useState<boolean>(true)

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
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email.trim(), pass)
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
    pb.authStore.clear()
    setUser(null)
    setToken(null)
    setIsValid(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, isValid, isLoading, login, logout }}>
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
