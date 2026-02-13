import { useParams } from 'react-router-dom'

export default function UserDetail() {
  const { id } = useParams()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Detail</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit
          </button>
          <button className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50">
            Disable
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">User ID: {id}</p>
            <p className="mt-2 text-sm text-gray-500">
              User details will load from GraphQL once resolvers are implemented.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              <button className="border-b-2 border-primary-600 px-1 py-3 text-sm font-medium text-primary-600">Profile</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Groups</button>
              <button className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Activity</button>
            </nav>
          </div>

          {/* Profile details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Profile Information</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Department</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
            </dl>
          </div>

          {/* Group membership */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Group Membership</h3>
              <button className="text-sm font-medium text-primary-600 hover:text-primary-800">Add to Group</button>
            </div>
            <p className="text-sm text-gray-500">No group memberships.</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Account</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">2FA Enabled</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Last Login</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Failed Logins</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">--</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
