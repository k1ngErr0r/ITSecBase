import { useParams } from 'react-router-dom'

export default function IncidentDetail() {
  const { id } = useParams()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Incident Detail</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit
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
            <p className="text-sm text-gray-500">Incident ID: {id}</p>
            <p className="mt-2 text-sm text-gray-500">
              Incident details will load from GraphQL once resolvers are implemented.
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Event Timeline</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gray-300" />
                  <div className="w-px flex-1 bg-gray-200" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">--</p>
                  <p className="text-sm text-gray-600">Incident reported</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              <button className="border-b-2 border-primary-600 px-1 py-3 text-sm font-medium text-primary-600">Details</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Actions</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Assets</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Vulnerabilities</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Comments</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Evidence</button>
            </nav>
          </div>

          {/* Actions table */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Corrective / Preventive Actions</h3>
              <button className="text-sm font-medium text-primary-600 hover:text-primary-800">Add Action</button>
            </div>
            <p className="text-sm text-gray-500">No actions recorded yet.</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Properties</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Impact Rating</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Classification</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Regulatory Breach</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">SLA Deadline</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
