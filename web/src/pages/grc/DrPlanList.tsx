import { Link } from 'react-router-dom'

export default function DrPlanList() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Disaster Recovery Plans</h1>
        <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          Add DR Plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Active Plans</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Last Test</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">--</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Next Scheduled Test</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">--</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="text"
          placeholder="Search DR plans..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">RTO</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">RPO</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Last Test</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={7}>
                No DR plans yet. <Link to="#" className="text-primary-600 hover:underline">Create your first DR plan</Link>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
