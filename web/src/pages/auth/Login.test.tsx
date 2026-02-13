import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.restoreAllMocks()
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('renders SecBase heading', () => {
    renderLogin()
    expect(screen.getByText('SecBase')).toBeInTheDocument()
    expect(screen.getByText('Information Security Management')).toBeInTheDocument()
  })

  it('does not show TOTP field initially', () => {
    renderLogin()
    expect(screen.queryByLabelText('2FA Code')).not.toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        errors: [{ message: 'invalid email or password' }],
      }),
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('invalid email or password')).toBeInTheDocument()
    })
  })

  it('navigates to / on successful login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        data: {
          login: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            user: {
              id: '1',
              email: 'test@example.com',
              displayName: 'Test User',
              totpEnabled: false,
            },
          },
        },
      }),
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    expect(localStorage.getItem('secbase_access_token')).toBe('test-access-token')
    expect(localStorage.getItem('secbase_refresh_token')).toBe('test-refresh-token')
  })

  it('shows TOTP field when server requires 2FA', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        errors: [{ message: 'TOTP required' }],
      }),
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByLabelText('2FA Code')).toBeInTheDocument()
    })
  })

  it('shows network error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables button while loading', async () => {
    let resolveLogin: (value: any) => void
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })

    // Resolve the fetch to avoid lingering promises
    resolveLogin!({
      json: () => Promise.resolve({ errors: [{ message: 'done' }] }),
    })
  })
})
