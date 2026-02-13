export default function IsoControlList() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ISO 27001:2022 Controls</h1>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Export SOA
        </button>
      </div>

      {/* Compliance summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Implemented</p>
          <p className="mt-1 text-2xl font-bold text-green-600">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Partially Implemented</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Not Implemented</p>
          <p className="mt-1 text-2xl font-bold text-red-600">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Not Applicable</p>
          <p className="mt-1 text-2xl font-bold text-gray-500">0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Themes</option>
          <option value="organisational">Organisational</option>
          <option value="people">People</option>
          <option value="physical">Physical</option>
          <option value="technological">Technological</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="implemented">Implemented</option>
          <option value="partially_implemented">Partially Implemented</option>
          <option value="not_implemented">Not Implemented</option>
          <option value="not_applicable">Not Applicable</option>
        </select>
        <input
          type="text"
          placeholder="Search controls..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Controls grouped by theme */}
      {['Organisational', 'People', 'Physical', 'Technological'].map((theme) => (
        <div key={theme} className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{theme} Controls</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Control ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Applicability</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Implementation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-center text-sm text-gray-500" colSpan={5}>
                    Controls will load once seed data and resolvers are implemented.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
