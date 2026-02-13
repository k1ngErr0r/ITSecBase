import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { StatusBadge, Modal, CommentThread } from '../../components/common'

const DrPlanDetailQuery = graphql`
  query DrPlanDetailQuery($id: ID!) {
    drPlan(id: $id) {
      id
      name
      scope
      version
      rtoMinutes
      rpoMinutes
      playbook
      status
      owner {
        id
        displayName
        email
      }
      createdAt
      updatedAt
      tests {
        id
        testType
        plannedDate
        actualDate
        result
        observations
        createdAt
      }
      assets(first: 20) {
        edges {
          node {
            id
            name
            assetType
          }
        }
        totalCount
      }
      comments(first: 50) {
        edges {
          node {
            id
            body
            author {
              id
              displayName
            }
            createdAt
            updatedAt
          }
        }
        totalCount
      }
      evidence(first: 20) {
        edges {
          node {
            id
            fileName
            fileSize
            contentType
            uploadedBy {
              id
              displayName
            }
            createdAt
          }
        }
        totalCount
      }
    }
  }
`

const UpdateDrPlanMutation = graphql`
  mutation DrPlanDetailUpdateMutation($id: ID!, $input: UpdateDrPlanInput!) {
    updateDrPlan(id: $id, input: $input) {
      id
      name
      scope
      version
      rtoMinutes
      rpoMinutes
      playbook
      status
    }
  }
`

const DeleteDrPlanMutation = graphql`
  mutation DrPlanDetailDeleteMutation($id: ID!) {
    deleteDrPlan(id: $id)
  }
`

const RecordDrTestMutation = graphql`
  mutation DrPlanDetailRecordTestMutation(
    $planId: ID!
    $input: RecordDrTestInput!
  ) {
    recordDrTest(planId: $planId, input: $input) {
      id
      testType
      plannedDate
      actualDate
      result
      observations
    }
  }
`

const AddCommentMutation = graphql`
  mutation DrPlanDetailAddCommentMutation($input: AddCommentInput!) {
    addComment(input: $input) {
      id
      body
      author {
        id
        displayName
      }
      createdAt
    }
  }
`

function DrPlanDetailContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useLazyLoadQuery<any>(DrPlanDetailQuery, { id })
  const [commitUpdate] = useMutation(UpdateDrPlanMutation)
  const [commitDelete] = useMutation(DeleteDrPlanMutation)
  const [commitRecordTest, recordingTest] = useMutation(RecordDrTestMutation)
  const [commitAddComment] = useMutation(AddCommentMutation)

  const [activeTab, setActiveTab] = useState('playbook')
  const [showEdit, setShowEdit] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const plan = data.drPlan
  if (!plan) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        DR Plan not found.{' '}
        <Link to="/grc/dr-plans" className="text-primary-600 hover:underline">
          Back to DR Plans
        </Link>
      </div>
    )
  }

  const [editForm, setEditForm] = useState({
    name: plan.name,
    scope: plan.scope,
    version: plan.version,
    rtoMinutes: plan.rtoMinutes?.toString() || '',
    rpoMinutes: plan.rpoMinutes?.toString() || '',
    playbook: plan.playbook,
    status: plan.status,
  })

  const [testForm, setTestForm] = useState({
    testType: 'tabletop',
    plannedDate: '',
    actualDate: '',
    result: '',
    observations: '',
  })

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatMinutes = (m: number | null) => {
    if (m == null) return '--'
    if (m < 60) return `${m} min`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    commitUpdate({
      variables: {
        id: plan.id,
        input: {
          name: editForm.name,
          scope: editForm.scope || undefined,
          version: editForm.version || undefined,
          rtoMinutes: editForm.rtoMinutes
            ? parseInt(editForm.rtoMinutes)
            : undefined,
          rpoMinutes: editForm.rpoMinutes
            ? parseInt(editForm.rpoMinutes)
            : undefined,
          playbook: editForm.playbook || undefined,
          status: editForm.status,
        },
      },
      onCompleted: () => setShowEdit(false),
    })
  }

  const handleDelete = () => {
    commitDelete({
      variables: { id: plan.id },
      onCompleted: () => navigate('/grc/dr-plans'),
    })
  }

  const handleRecordTest = (e: React.FormEvent) => {
    e.preventDefault()
    commitRecordTest({
      variables: {
        planId: plan.id,
        input: {
          testType: testForm.testType,
          plannedDate: testForm.plannedDate || undefined,
          actualDate: testForm.actualDate || undefined,
          result: testForm.result || undefined,
          observations: testForm.observations || undefined,
        },
      },
      onCompleted: () => {
        setShowTestModal(false)
        setTestForm({
          testType: 'tabletop',
          plannedDate: '',
          actualDate: '',
          result: '',
          observations: '',
        })
      },
    })
  }

  const handleAddComment = (body: string) => {
    commitAddComment({
      variables: {
        input: { entityType: 'dr_plan', entityId: plan.id, body },
      },
    })
  }

  const tabs = ['playbook', 'tests', 'assets', 'comments', 'evidence']

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/grc/dr-plans"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          DR Plans
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">{plan.name}</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Record Test
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
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

          {/* Playbook tab */}
          {activeTab === 'playbook' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Playbook
              </h3>
              {plan.playbook ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {plan.playbook}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No playbook content yet. Edit the plan to add a playbook.
                </p>
              )}
            </div>
          )}

          {/* Tests tab */}
          {activeTab === 'tests' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Test History
                </h3>
                <button
                  onClick={() => setShowTestModal(true)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-800"
                >
                  Record Test
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Type
                    </th>
                    <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Planned
                    </th>
                    <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Actual
                    </th>
                    <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Result
                    </th>
                    <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Observations
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {plan.tests.length === 0 ? (
                    <tr>
                      <td
                        className="py-4 text-center text-sm text-gray-500"
                        colSpan={5}
                      >
                        No tests recorded yet.
                      </td>
                    </tr>
                  ) : (
                    plan.tests.map((test: any) => (
                      <tr key={test.id}>
                        <td className="py-3 text-sm text-gray-700">
                          {test.testType?.replace('_', ' ') || '--'}
                        </td>
                        <td className="py-3 text-sm text-gray-700">
                          {formatDate(test.plannedDate)}
                        </td>
                        <td className="py-3 text-sm text-gray-700">
                          {formatDate(test.actualDate)}
                        </td>
                        <td className="py-3">
                          {test.result ? (
                            <StatusBadge status={test.result} />
                          ) : (
                            <span className="text-sm text-gray-400">--</span>
                          )}
                        </td>
                        <td className="max-w-xs truncate py-3 text-sm text-gray-700">
                          {test.observations || '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Assets tab */}
          {activeTab === 'assets' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Covered Assets ({plan.assets.totalCount})
              </h3>
              {plan.assets.edges.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No assets linked to this DR plan.
                </p>
              ) : (
                <div className="space-y-2">
                  {plan.assets.edges.map((edge: any) => (
                    <Link
                      key={edge.node.id}
                      to={`/assets/${edge.node.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {edge.node.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {edge.node.assetType}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <CommentThread
                comments={plan.comments.edges.map((e: any) => ({
                  id: e.node.id,
                  body: e.node.body,
                  authorName: e.node.author?.displayName || 'Unknown',
                  createdAt: e.node.createdAt,
                }))}
                onAdd={handleAddComment}
              />
            </div>
          )}

          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Evidence ({plan.evidence.totalCount})
              </h3>
              {plan.evidence.edges.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No evidence files uploaded.
                </p>
              ) : (
                <div className="space-y-2">
                  {plan.evidence.edges.map((edge: any) => (
                    <div
                      key={edge.node.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {edge.node.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(edge.node.fileSize / 1024).toFixed(1)} KB -{' '}
                          {edge.node.uploadedBy?.displayName || 'Unknown'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(edge.node.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Properties
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={plan.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Version</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {plan.version || '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">RTO</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatMinutes(plan.rtoMinutes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">RPO</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatMinutes(plan.rpoMinutes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {plan.owner?.displayName || '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Scope</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {plan.scope || '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(plan.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(plan.updatedAt)}
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
        title="Edit DR Plan"
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Scope
            </label>
            <textarea
              value={editForm.scope}
              onChange={(e) =>
                setEditForm({ ...editForm, scope: e.target.value })
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Playbook
            </label>
            <textarea
              value={editForm.playbook}
              onChange={(e) =>
                setEditForm({ ...editForm, playbook: e.target.value })
              }
              rows={10}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Version
              </label>
              <input
                type="text"
                value={editForm.version}
                onChange={(e) =>
                  setEditForm({ ...editForm, version: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                RTO (min)
              </label>
              <input
                type="number"
                value={editForm.rtoMinutes}
                onChange={(e) =>
                  setEditForm({ ...editForm, rtoMinutes: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                RPO (min)
              </label>
              <input
                type="number"
                value={editForm.rpoMinutes}
                onChange={(e) =>
                  setEditForm({ ...editForm, rpoMinutes: e.target.value })
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

      {/* Record Test Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Record DR Test"
      >
        <form onSubmit={handleRecordTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Test Type *
            </label>
            <select
              value={testForm.testType}
              onChange={(e) =>
                setTestForm({ ...testForm, testType: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="tabletop">Tabletop</option>
              <option value="functional">Functional</option>
              <option value="full_failover">Full Failover</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Planned Date
              </label>
              <input
                type="date"
                value={testForm.plannedDate}
                onChange={(e) =>
                  setTestForm({ ...testForm, plannedDate: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Actual Date
              </label>
              <input
                type="date"
                value={testForm.actualDate}
                onChange={(e) =>
                  setTestForm({ ...testForm, actualDate: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Result
            </label>
            <select
              value={testForm.result}
              onChange={(e) =>
                setTestForm({ ...testForm, result: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Not yet determined</option>
              <option value="pass">Pass</option>
              <option value="partial">Partial</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observations
            </label>
            <textarea
              value={testForm.observations}
              onChange={(e) =>
                setTestForm({ ...testForm, observations: e.target.value })
              }
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowTestModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordingTest}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {recordingTest ? 'Recording...' : 'Record Test'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete DR Plan"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete "{plan.name}"? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default function DrPlanDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <DrPlanDetailContent />
    </Suspense>
  )
}
