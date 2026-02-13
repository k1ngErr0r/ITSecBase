import { Link } from 'react-router-dom'

export default function GroupList() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          Create Group
        </button>
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Default role cards placeholder */}
        {['InfoSec Manager', 'Security Analyst', 'Viewer', 'Admin'].map((role) => (
          <div key={role} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{role}</h3>
            <p className="mt-1 text-xs text-gray-500">Default role</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">0 members</span>
              <Link to="#" className="text-sm font-medium text-primary-600 hover:text-primary-800">Manage</Link>
            </div>
          </div>
        ))}
      </div>

      {/* Custom groups table */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Custom Groups</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={5}>
                  No custom groups yet. <Link to="#" className="text-primary-600 hover:underline">Create your first group</Link>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
