import { Link } from 'react-router-dom'

export default function AssetList() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Import
          </button>
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export
          </button>
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Add Asset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="server">Server</option>
          <option value="workstation">Workstation</option>
          <option value="application">Application</option>
          <option value="database">Database</option>
          <option value="network_device">Network Device</option>
          <option value="saas">SaaS</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="dev">Dev</option>
          <option value="test">Test</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="in_use">In Use</option>
          <option value="decommissioning">Decommissioning</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
        <input
          type="text"
          placeholder="Search assets..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Environment</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Criticality</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={6}>
                No assets yet. <Link to="#" className="text-primary-600 hover:underline">Add your first asset</Link>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
