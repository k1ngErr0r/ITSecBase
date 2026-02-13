import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface NavItem {
  label: string
  path: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'Vulnerabilities', path: '/vulnerabilities' },
  { label: 'Assets', path: '/assets' },
  {
    label: 'GRC',
    path: '/grc',
    children: [
      { label: 'Risks', path: '/grc/risks' },
      { label: 'Incidents', path: '/grc/incidents' },
      { label: 'Disaster Recovery', path: '/grc/dr-plans' },
      { label: 'ISO 27001', path: '/grc/iso-controls' },
    ],
  },
  {
    label: 'Admin',
    path: '/admin',
    children: [
      { label: 'Users', path: '/admin/users' },
      { label: 'Groups', path: '/admin/groups' },
      { label: 'Profile', path: '/admin/profile' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '/grc': location.pathname.startsWith('/grc'),
    '/admin': location.pathname.startsWith('/admin'),
  })

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  return (
    <aside className="flex w-64 flex-col bg-sidebar-bg text-white">
      <div className="flex h-16 items-center justify-center border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wide">SecBase</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => (
            <li key={item.path}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.path)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-hover ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-sidebar-active text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        expanded[item.path] ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  {expanded[item.path] && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <NavLink
                            to={child.path}
                            className={({ isActive }) =>
                              `block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-hover ${
                                isActive
                                  ? 'bg-sidebar-active font-medium text-white'
                                  : 'text-slate-400'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-hover ${
                      isActive
                        ? 'bg-sidebar-active text-white'
                        : 'text-slate-300'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-700 p-4">
        <p className="text-xs text-slate-500">SecBase v0.1.0</p>
      </div>
    </aside>
  )
}
