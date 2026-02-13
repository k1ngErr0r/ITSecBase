import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { Link } from 'react-router-dom'
import { StatusBadge, Modal, Pagination } from '../../components/common'
import { usePagination } from '../../hooks/usePagination'
import { useFilters } from '../../hooks/useFilters'

const UserListQuery = graphql`
  query UserListQuery($first: Int, $after: String, $filter: UserFilter) {
    users(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          email
          displayName
          department
          status
          totpEnabled
          lastLoginAt
          groups(first: 5) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      totalCount
    }
    groups(first: 50) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`

const CreateUserMutation = graphql`
  mutation UserListCreateMutation($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      displayName
      status
    }
  }
`

function UserListContent() {
  const { filters, updateFilter } = useFilters({
    status: '',
    groupId: '',
    search: '',
  })
  const pagination = usePagination()
  const [showCreate, setShowCreate] = useState(false)
  const [commitCreate, creating] = useMutation(CreateUserMutation)

  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    jobTitle: '',
    department: '',
    groupIds: [] as string[],
  })

  const filter: Record<string, any> = {}
  if (filters.status) filter.status = filters.status
  if (filters.groupId) filter.groupId = filters.groupId
  if (filters.search) filter.search = filters.search

  const data = useLazyLoadQuery<any>(UserListQuery, {
    first: pagination.pageSize,
    after: pagination.after,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  })

  const users = data.users
  const allGroups = data.groups.edges.map((e: any) => e.node)

  const formatDate = (d: string | null) => {
    if (!d) return 'Never'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    commitCreate({
      variables: {
        input: {
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          jobTitle: form.jobTitle || undefined,
          department: form.department || undefined,
          groupIds:
            form.groupIds.length > 0 ? form.groupIds : undefined,
        },
      },
      onCompleted: () => {
        setShowCreate(false)
        setForm({
          email: '',
          password: '',
          displayName: '',
          jobTitle: '',
          department: '',
          groupIds: [],
        })
      },
    })
  }

  const toggleGroup = (gid: string) => {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(gid)
        ? f.groupIds.filter((id) => id !== gid)
        : [...f.groupIds, gid],
    }))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => {
            updateFilter('status', e.target.value)
            pagination.reset()
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          value={filters.groupId}
          onChange={(e) => {
            updateFilter('groupId', e.target.value)
            pagination.reset()
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Groups</option>
          {allGroups.map((g: any) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => {
            updateFilter('search', e.target.value)
            pagination.reset()
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Groups
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                2FA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Last Login
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.edges.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-gray-500"
                  colSpan={7}
                >
                  No users found.{' '}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-primary-600 hover:underline"
                  >
                    Add your first user
                  </button>
                  .
                </td>
              </tr>
            ) : (
              users.edges.map((edge: any) => {
                const user = edge.node
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {user.displayName || user.email}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.department || '--'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.groups.edges.length === 0 ? (
                          <span className="text-sm text-gray-400">--</span>
                        ) : (
                          user.groups.edges.map((ge: any) => (
                            <span
                              key={ge.node.id}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                            >
                              {ge.node.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.totpEnabled ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(user.lastLoginAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalCount={users.totalCount}
        hasNextPage={users.pageInfo.hasNextPage}
        hasPreviousPage={users.pageInfo.hasPreviousPage}
        onNextPage={() => pagination.goToNextPage(users.pageInfo.endCursor)}
        onPreviousPage={pagination.goToPreviousPage}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Title
              </label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) =>
                  setForm({ ...form, jobTitle: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {allGroups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Groups
              </label>
              <div className="mt-2 space-y-2">
                {allGroups.map((g: any) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.groupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function UserList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <UserListContent />
    </Suspense>
  )
}
