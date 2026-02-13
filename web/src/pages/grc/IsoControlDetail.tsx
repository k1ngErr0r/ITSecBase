import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useParams, Link } from 'react-router-dom'
import { StatusBadge, Modal, CommentThread } from '../../components/common'

const IsoControlDetailQuery = graphql`
  query IsoControlDetailQuery($id: ID!) {
    orgIsoControl(id: $id) {
      id
      control {
        id
        controlId
        name
        theme
        description
      }
      applicability
      nonApplicabilityJustification
      implementationStatus
      implementationDescription
      responsibleOwner {
        id
        displayName
        email
      }
      createdAt
      updatedAt
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
      risks(first: 20) {
        edges {
          node {
            id
            title
            status
            calculatedResidualLevel
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

const UpdateOrgIsoControlMutation = graphql`
  mutation IsoControlDetailUpdateMutation(
    $id: ID!
    $input: UpdateOrgIsoControlInput!
  ) {
    updateOrgIsoControl(id: $id, input: $input) {
      id
      applicability
      nonApplicabilityJustification
      implementationStatus
      implementationDescription
      responsibleOwner {
        id
        displayName
      }
    }
  }
`

const AddCommentMutation = graphql`
  mutation IsoControlDetailAddCommentMutation($input: AddCommentInput!) {
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

function IsoControlDetailContent() {
  const { id } = useParams()
  const data = useLazyLoadQuery<any>(IsoControlDetailQuery, { id })
  const [commitUpdate] = useMutation(UpdateOrgIsoControlMutation)
  const [commitAddComment] = useMutation(AddCommentMutation)

  const [activeTab, setActiveTab] = useState('soa')
  const [showEdit, setShowEdit] = useState(false)

  const oc = data.orgIsoControl
  if (!oc) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        ISO Control not found.{' '}
        <Link to="/grc/iso-controls" className="text-primary-600 hover:underline">
          Back to ISO Controls
        </Link>
      </div>
    )
  }

  const [editForm, setEditForm] = useState({
    applicability: oc.applicability,
    nonApplicabilityJustification: oc.nonApplicabilityJustification,
    implementationStatus: oc.implementationStatus,
    implementationDescription: oc.implementationDescription,
  })

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    commitUpdate({
      variables: {
        id: oc.id,
        input: {
          applicability: editForm.applicability,
          nonApplicabilityJustification:
            editForm.nonApplicabilityJustification || undefined,
          implementationStatus: editForm.implementationStatus,
          implementationDescription:
            editForm.implementationDescription || undefined,
        },
      },
      onCompleted: () => setShowEdit(false),
    })
  }

  const handleAddComment = (body: string) => {
    commitAddComment({
      variables: {
        input: { entityType: 'org_iso_control', entityId: oc.id, body },
      },
    })
  }

  const tabs = ['soa', 'assets', 'risks', 'comments', 'evidence']
  const tabLabels: Record<string, string> = {
    soa: 'SOA Details',
    assets: 'Assets',
    risks: 'Risks',
    comments: 'Comments',
    evidence: 'Evidence',
  }

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/grc/iso-controls"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ISO Controls
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">
          {oc.control.controlId} - {oc.control.name}
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {oc.control.controlId} - {oc.control.name}
          </h1>
          {oc.control.description && (
            <p className="mt-1 text-sm text-gray-500">
              {oc.control.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
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
                  className={`border-b-2 px-1 py-3 text-sm font-medium ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </nav>
          </div>

          {/* SOA Details tab */}
          {activeTab === 'soa' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Statement of Applicability
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-700">
                    Implementation Description
                  </dt>
                  <dd className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {oc.implementationDescription || '--'}
                  </dd>
                </div>
                {oc.applicability === 'not_applicable' && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700">
                      Non-Applicability Justification
                    </dt>
                    <dd className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {oc.nonApplicabilityJustification || '--'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Assets tab */}
          {activeTab === 'assets' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Related Assets ({oc.assets.totalCount})
              </h3>
              {oc.assets.edges.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No assets linked to this control.
                </p>
              ) : (
                <div className="space-y-2">
                  {oc.assets.edges.map((edge: any) => (
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

          {/* Risks tab */}
          {activeTab === 'risks' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Related Risks ({oc.risks.totalCount})
              </h3>
              {oc.risks.edges.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No risks linked to this control.
                </p>
              ) : (
                <div className="space-y-2">
                  {oc.risks.edges.map((edge: any) => (
                    <Link
                      key={edge.node.id}
                      to={`/grc/risks/${edge.node.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {edge.node.title}
                      </span>
                      <div className="flex gap-2">
                        <StatusBadge status={edge.node.status} />
                        {edge.node.calculatedResidualLevel && (
                          <StatusBadge
                            status={edge.node.calculatedResidualLevel}
                          />
                        )}
                      </div>
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
                comments={oc.comments.edges.map((e: any) => ({
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
                Evidence ({oc.evidence.totalCount})
              </h3>
              {oc.evidence.edges.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No evidence files uploaded.
                </p>
              ) : (
                <div className="space-y-2">
                  {oc.evidence.edges.map((edge: any) => (
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
              Control Properties
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Control ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">
                  {oc.control.controlId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Theme</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {oc.control.theme}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Applicability
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={oc.applicability} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Implementation Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={oc.implementationStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Responsible Owner
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {oc.responsibleOwner?.displayName || '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(oc.updatedAt)}
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
        title={`Edit ${oc.control.controlId}`}
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Applicability
              </label>
              <select
                value={editForm.applicability}
                onChange={(e) =>
                  setEditForm({ ...editForm, applicability: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="applicable">Applicable</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Implementation Status
              </label>
              <select
                value={editForm.implementationStatus}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    implementationStatus: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="not_implemented">Not Implemented</option>
                <option value="partially_implemented">
                  Partially Implemented
                </option>
                <option value="implemented">Implemented</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Implementation Description
            </label>
            <textarea
              value={editForm.implementationDescription}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  implementationDescription: e.target.value,
                })
              }
              rows={6}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Describe how this control is implemented in your organisation..."
            />
          </div>
          {editForm.applicability === 'not_applicable' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Non-Applicability Justification
              </label>
              <textarea
                value={editForm.nonApplicabilityJustification}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    nonApplicabilityJustification: e.target.value,
                  })
                }
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Explain why this control is not applicable..."
              />
            </div>
          )}
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
    </div>
  )
}

export default function IsoControlDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <IsoControlDetailContent />
    </Suspense>
  )
}
