import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { Modal } from '../../components/common'

const GroupListQuery = graphql`
  query GroupListQuery {
    groups(first: 100) {
      edges {
        node {
          id
          name
          description
          permissions
          createdAt
          members(first: 0) {
            totalCount
          }
        }
      }
      totalCount
    }
  }
`

const CreateGroupMutation = graphql`
  mutation GroupListCreateMutation($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
      name
      description
      permissions
    }
  }
`

const UpdateGroupMutation = graphql`
  mutation GroupListUpdateMutation($id: ID!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
      permissions
    }
  }
`

const DeleteGroupMutation = graphql`
  mutation GroupListDeleteMutation($id: ID!) {
    deleteGroup(id: $id)
  }
`

const availablePermissions = [
  'assets:read',
  'assets:write',
  'vulnerabilities:read',
  'vulnerabilities:write',
  'risks:read',
  'risks:write',
  'incidents:read',
  'incidents:write',
  'dr_plans:read',
  'dr_plans:write',
  'iso_controls:read',
  'iso_controls:write',
  'users:read',
  'users:write',
  'groups:read',
  'groups:write',
]

function GroupListContent() {
  const data = useLazyLoadQuery<any>(GroupListQuery, {})
  const [commitCreate, creating] = useMutation(CreateGroupMutation)
  const [commitUpdate] = useMutation(UpdateGroupMutation)
  const [commitDelete] = useMutation(DeleteGroupMutation)

  const [showCreate, setShowCreate] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [deleteGroup, setDeleteGroup] = useState<any>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  })

  const groups = data.groups

  const resetForm = () => {
    setForm({ name: '', description: '', permissions: [] })
  }

  const togglePermission = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    commitCreate({
      variables: {
        input: {
          name: form.name,
          description: form.description || undefined,
          permissions: form.permissions,
        },
      },
      onCompleted: () => {
        setShowCreate(false)
        resetForm()
      },
    })
  }

  const handleStartEdit = (group: any) => {
    setEditingGroup(group)
    setForm({
      name: group.name,
      description: group.description,
      permissions: [...group.permissions],
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup) return
    commitUpdate({
      variables: {
        id: editingGroup.id,
        input: {
          name: form.name || undefined,
          description: form.description || undefined,
          permissions: form.permissions,
        },
      },
      onCompleted: () => {
        setEditingGroup(null)
        resetForm()
      },
    })
  }

  const handleDelete = () => {
    if (!deleteGroup) return
    commitDelete({
      variables: { id: deleteGroup.id },
      onCompleted: () => setDeleteGroup(null),
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => {
            resetForm()
            setShowCreate(true)
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Create Group
        </button>
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.edges.map((edge: any) => {
          const group = edge.node
          return (
            <div
              key={group.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="mt-1 text-xs text-gray-500">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                {group.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {group.permissions.slice(0, 4).map((p: string) => (
                      <span
                        key={p}
                        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        {p}
                      </span>
                    ))}
                    {group.permissions.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{group.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No permissions</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm text-gray-600">
                  {group.members.totalCount} member
                  {group.members.totalCount !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleStartEdit(group)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteGroup(group)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {groups.edges.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No groups yet.{' '}
            <button
              onClick={() => setShowCreate(true)}
              className="text-primary-600 hover:underline"
            >
              Create your first group
            </button>
            .
          </p>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Group"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Permissions
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {availablePermissions.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
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
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingGroup}
        onClose={() => {
          setEditingGroup(null)
          resetForm()
        }}
        title="Edit Group"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Permissions
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {availablePermissions.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingGroup(null)
                resetForm()
              }}
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

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteGroup}
        onClose={() => setDeleteGroup(null)}
        title="Delete Group"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete the group "{deleteGroup?.name}"?
          Members will be removed from this group.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setDeleteGroup(null)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete Group
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default function GroupList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <GroupListContent />
    </Suspense>
  )
}
