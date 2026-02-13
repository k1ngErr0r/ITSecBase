import { Link } from 'react-router-dom'

export default function RiskList() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Risk Register</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export
          </button>
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Add Risk
          </button>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Risk Heatmap</h2>
        <div className="grid grid-cols-6 gap-1">
          {/* Header row */}
          <div />
          {['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'].map((label) => (
            <div key={label} className="text-center text-xs font-medium text-gray-500">{label}</div>
          ))}
          {/* Heatmap rows */}
          {['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'].map((likelihood, li) => (
            <>
              <div key={`label-${likelihood}`} className="flex items-center text-xs font-medium text-gray-500">{likelihood}</div>
              {[1, 2, 3, 4, 5].map((impact) => {
                const score = (5 - li) * impact
                let bg = 'bg-green-100'
                if (score >= 15) bg = 'bg-red-100'
                else if (score >= 10) bg = 'bg-orange-100'
                else if (score >= 5) bg = 'bg-yellow-100'
                return (
                  <div key={`${li}-${impact}`} className={`flex h-10 items-center justify-center rounded text-xs font-medium text-gray-600 ${bg}`}>
                    0
                  </div>
                )
              })}
            </>
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-gray-400">Impact →</div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="identified">Identified</option>
          <option value="assessed">Assessed</option>
          <option value="accepted">Accepted</option>
          <option value="mitigated">Mitigated</option>
          <option value="closed">Closed</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Categories</option>
          <option value="information_security">Information Security</option>
          <option value="compliance">Compliance</option>
          <option value="operational">Operational</option>
        </select>
        <input
          type="text"
          placeholder="Search risks..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Inherent Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Residual Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Review Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={7}>
                No risks yet. <Link to="#" className="text-primary-600 hover:underline">Add your first risk</Link>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
