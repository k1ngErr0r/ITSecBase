import { useParams } from 'react-router-dom'

export default function IsoControlDetail() {
  const { id } = useParams()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ISO Control Detail</h1>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Control ID: {id}</p>
            <p className="mt-2 text-sm text-gray-500">
              Control details will load from GraphQL once resolvers are implemented.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              <button className="border-b-2 border-primary-600 px-1 py-3 text-sm font-medium text-primary-600">SOA Details</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Assets</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Risks</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Comments</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Evidence</button>
            </nav>
          </div>

          {/* SOA Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Statement of Applicability</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-700">Implementation Description</dt>
                <dd className="mt-1 text-sm text-gray-500">--</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-700">Non-Applicability Justification</dt>
                <dd className="mt-1 text-sm text-gray-500">--</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Control Properties</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Control ID</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Theme</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Applicability</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Implementation Status</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Responsible Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
