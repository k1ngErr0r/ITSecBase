import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// Helper to create a valid-looking JWT with a future expiration
function createMockJWT(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      uid: 'user-1',
      oid: 'org-1',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  )
  return `${header}.${payload}.fake-signature`
}

function renderWithRouter(token: string | null) {
  if (token) {
    localStorage.setItem('secbase_access_token', token)
  }

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects to /login when no token exists', () => {
    renderWithRouter(null)
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when a valid token exists', () => {
    const token = createMockJWT(3600) // expires in 1 hour
    renderWithRouter(token)
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when token is expired', () => {
    const token = createMockJWT(-60) // expired 1 minute ago
    renderWithRouter(token)
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('clears localStorage when token is expired', () => {
    const token = createMockJWT(-60)
    localStorage.setItem('secbase_access_token', token)
    localStorage.setItem('secbase_refresh_token', 'refresh')
    localStorage.setItem('secbase_user', '{}')

    renderWithRouter(token)

    expect(localStorage.getItem('secbase_access_token')).toBeNull()
    expect(localStorage.getItem('secbase_refresh_token')).toBeNull()
    expect(localStorage.getItem('secbase_user')).toBeNull()
  })

  it('redirects when token cannot be parsed', () => {
    renderWithRouter('not-a-valid-jwt')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
