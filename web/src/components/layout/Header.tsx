import { useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('secbase_access_token')
    localStorage.removeItem('secbase_refresh_token')
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Information Security Management
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/profile')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
