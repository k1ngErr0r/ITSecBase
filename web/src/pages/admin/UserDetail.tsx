import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useParams, Link } from 'react-router-dom'
import { StatusBadge, Modal } from '../../components/common'

const UserDetailQuery = graphql`
  query UserDetailQuery($id: ID!) {
    node(id: $id) {
      ... on User {
        id
        email
        displayName
        jobTitle
        department
        profilePictureUrl
        status
        totpEnabled
        lastLoginAt
        createdAt
        updatedAt
        groups(first: 20) {
          edges {
            node {
              id
              name
              description
            }
          }
        }
      }
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

const UpdateUserMutation = graphql`
  mutation UserDetailUpdateMutation($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      displayName
      jobTitle
      department
      status
    }
  }
`

const DisableUserMutation = graphql`
  mutation UserDetailDisableMutation($id: ID!) {
    disableUser(id: $id) {
      id
      status
    }
  }
`

const EnableUserMutation = graphql`
  mutation UserDetailEnableMutation($id: ID!) {
    enableUser(id: $id) {
      id
      status
    }
  }
`

const AddUserToGroupMutation = graphql`
  mutation UserDetailAddToGroupMutation($userId: ID!, $groupId: ID!) {
    addUserToGroup(userId: $userId, groupId: $groupId)
  }
`

const RemoveUserFromGroupMutation = graphql`
  mutation UserDetailRemoveFromGroupMutation($userId: ID!, $groupId: ID!) {
    removeUserFromGroup(userId: $userId, groupId: $groupId)
  }
`

function UserDetailContent() {
  const { id } = useParams()
  const data = useLazyLoadQuery<any>(UserDetailQuery, { id })
  const [commitUpdate] = useMutation(UpdateUserMutation)
  const [commitDisable] = useMutation(DisableUserMutation)
  const [commitEnable] = useMutation(EnableUserMutation)
  const [commitAddGroup] = useMutation(AddUserToGroupMutation)
  const [commitRemoveGroup] = useMutation(RemoveUserFromGroupMutation)

  const [activeTab, setActiveTab] = useState('profile')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const user = data.node
  const allGroups = data.groups.edges.map((e: any) => e.node)

  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        User not found.{' '}
        <Link to="/admin/users" className="text-primary-600 hover:underline">
          Back to Users
        </Link>
      </div>
    )
  }

  const [editForm, setEditForm] = useState({
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    department: user.department,
  })

  const userGroupIds = new Set(
    user.groups.edges.map((e: any) => e.node.id),
  )
  const availableGroups = allGroups.filter(
    (g: any) => !userGroupIds.has(g.id),
  )

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (d: string | null) => {
    if (!d) return 'Never'
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    commitUpdate({
      variables: {
        id: user.id,
        input: {
          displayName: editForm.displayName || undefined,
          jobTitle: editForm.jobTitle || undefined,
          department: editForm.department || undefined,
        },
      },
      onCompleted: () => setShowEdit(false),
    })
  }

  const handleDisable = () => {
    commitDisable({
      variables: { id: user.id },
      onCompleted: () => setShowDisableConfirm(false),
    })
  }

  const handleEnable = () => {
    commitEnable({
      variables: { id: user.id },
    })
  }

  const handleAddToGroup = (groupId: string) => {
    commitAddGroup({
      variables: { userId: user.id, groupId },
      onCompleted: () => setShowAddGroup(false),
    })
  }

  const handleRemoveFromGroup = (groupId: string) => {
    commitRemoveGroup({
      variables: { userId: user.id, groupId },
    })
  }

  const tabs = ['profile', 'groups', 'activity']

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/admin/users"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Users
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">
          {user.displayName || user.email}
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {user.displayName || user.email}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          {user.status === 'active' ? (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={handleEnable}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-1 py-3 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Profile Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Display Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.displayName || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Job Title
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.jobTitle || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Department
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.department || '--'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Groups tab */}
          {activeTab === 'groups' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Group Membership
                </h3>
                {availableGroups.length > 0 && (
                  <button
                    onClick={() => setShowAddGroup(true)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800"
                  >
                    Add to Group
                  </button>
                )}
              </div>
              {user.groups.edges.length === 0 ? (
                <p className="text-sm text-gray-500">No group memberships.</p>
              ) : (
                <div className="space-y-2">
                  {user.groups.edges.map((edge: any) => (
                    <div
                      key={edge.node.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {edge.node.name}
                        </p>
                        {edge.node.description && (
                          <p className="text-xs text-gray-500">
                            {edge.node.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFromGroup(edge.node.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-500">
                Activity logging will be available in a future update.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Account
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={user.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  2FA Enabled
                </dt>
                <dd className="mt-1">
                  {user.totpEnabled ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      Not Enabled
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Last Login
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(user.lastLoginAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit User"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              type="text"
              value={editForm.displayName}
              onChange={(e) =>
                setEditForm({ ...editForm, displayName: e.target.value })
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
                value={editForm.jobTitle}
                onChange={(e) =>
                  setEditForm({ ...editForm, jobTitle: e.target.value })
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
                value={editForm.department}
                onChange={(e) =>
                  setEditForm({ ...editForm, department: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Add to Group Modal */}
      <Modal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        title="Add to Group"
        size="sm"
      >
        <div className="space-y-2">
          {availableGroups.length === 0 ? (
            <p className="text-sm text-gray-500">
              User is already a member of all groups.
            </p>
          ) : (
            availableGroups.map((g: any) => (
              <button
                key={g.id}
                onClick={() => handleAddToGroup(g.id)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  {g.name}
                </span>
                <span className="text-xs font-medium text-primary-600">
                  Add
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Disable Confirmation */}
      <Modal
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        title="Disable User"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to disable{' '}
          {user.displayName || user.email}? They will no longer be able to
          sign in.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowDisableConfirm(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDisable}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Disable User
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default function UserDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <UserDetailContent />
    </Suspense>
  )
}
