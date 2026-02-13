import { useParams } from 'react-router-dom'

export default function DrPlanDetail() {
  const { id } = useParams()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">DR Plan Detail</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit
          </button>
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Record Test
          </button>
          <button className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">DR Plan ID: {id}</p>
            <p className="mt-2 text-sm text-gray-500">
              DR Plan details will load from GraphQL once resolvers are implemented.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              <button className="border-b-2 border-primary-600 px-1 py-3 text-sm font-medium text-primary-600">Playbook</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Assets</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Test History</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Comments</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Evidence</button>
            </nav>
          </div>

          {/* Playbook content */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Playbook</h3>
            <p className="text-sm text-gray-500">No playbook content yet.</p>
          </div>

          {/* Test History */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Test History</h3>
              <button className="text-sm font-medium text-primary-600 hover:text-primary-800">Record Test</button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Planned Date</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Actual Date</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Result</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Observations</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 text-center text-sm text-gray-500" colSpan={5}>
                    No tests recorded yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Properties</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Version</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">RTO</dt>
                <dd className="mt-1 text-sm text-gray-900">-- minutes</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">RPO</dt>
                <dd className="mt-1 text-sm text-gray-900">-- minutes</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
