import { useState, useCallback, useEffect } from 'react'

interface AuthUser {
  id: string
  email: string
  displayName: string
  totpEnabled: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('secbase_access_token')
    const userData = localStorage.getItem('secbase_user')
    if (token && userData) {
      try {
        const user = JSON.parse(userData) as AuthUser
        setState({ user, isAuthenticated: true, isLoading: false })
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  const login = useCallback(
    (accessToken: string, refreshToken: string, user: AuthUser) => {
      localStorage.setItem('secbase_access_token', accessToken)
      localStorage.setItem('secbase_refresh_token', refreshToken)
      localStorage.setItem('secbase_user', JSON.stringify(user))
      setState({ user, isAuthenticated: true, isLoading: false })
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('secbase_access_token')
    localStorage.removeItem('secbase_refresh_token')
    localStorage.removeItem('secbase_user')
    setState({ user: null, isAuthenticated: false, isLoading: false })
    window.location.href = '/login'
  }, [])

  return { ...state, login, logout }
}
