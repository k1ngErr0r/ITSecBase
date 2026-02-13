import { Navigate, useLocation } from 'react-router-dom'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const token = localStorage.getItem('secbase_access_token')

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('secbase_access_token')
    localStorage.removeItem('secbase_refresh_token')
    localStorage.removeItem('secbase_user')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
