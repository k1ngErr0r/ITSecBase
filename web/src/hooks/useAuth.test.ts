import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from './useAuth'

// Mock window.location
const locationMock = { href: '' }
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
})

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    locationMock.href = ''
  })

  it('initializes as unauthenticated when no token exists', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('initializes as authenticated when token and user exist in localStorage', () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test', totpEnabled: false }
    localStorage.setItem('secbase_access_token', 'fake-token')
    localStorage.setItem('secbase_user', JSON.stringify(user))

    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(user)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles corrupted user JSON gracefully', () => {
    localStorage.setItem('secbase_access_token', 'fake-token')
    localStorage.setItem('secbase_user', 'not-valid-json')

    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('login stores credentials and updates state', () => {
    const { result } = renderHook(() => useAuth())
    const user = { id: '2', email: 'login@example.com', displayName: 'Login User', totpEnabled: true }

    act(() => {
      result.current.login('access-token', 'refresh-token', user)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(user)
    expect(localStorage.getItem('secbase_access_token')).toBe('access-token')
    expect(localStorage.getItem('secbase_refresh_token')).toBe('refresh-token')
    expect(JSON.parse(localStorage.getItem('secbase_user')!)).toEqual(user)
  })

  it('logout clears credentials and redirects to /login', () => {
    const user = { id: '3', email: 'logout@example.com', displayName: 'Logout User', totpEnabled: false }
    localStorage.setItem('secbase_access_token', 'token')
    localStorage.setItem('secbase_refresh_token', 'refresh')
    localStorage.setItem('secbase_user', JSON.stringify(user))

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('secbase_access_token')).toBeNull()
    expect(localStorage.getItem('secbase_refresh_token')).toBeNull()
    expect(localStorage.getItem('secbase_user')).toBeNull()
    expect(locationMock.href).toBe('/login')
  })
})
