import { Suspense, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import DataTable from '../../components/common/DataTable'
import CommentThread from '../../components/common/CommentThread'
import FileUpload from '../../components/common/FileUpload'

const RISK_DETAIL_QUERY = graphql`
  query RiskDetailQuery($id: ID!) {
    risk(id: $id) {
      id
      title
      description
      scenario
      category
      source
      inherentLikelihood
      inherentImpact
      calculatedInherentLevel
      residualLikelihood
      residualImpact
      calculatedResidualLevel
      status
      owner {
        id
        displayName
        email
      }
      approver {
        id
        displayName
      }
      reviewDate
      lastReviewedBy {
        id
        displayName
      }
      createdAt
      updatedAt
      treatments {
        id
        action
        responsible {
          id
          displayName
        }
        deadline
        status
        createdAt
      }
      controls {
        id
        control {
          controlId
          name
        }
        implementationStatus
      }
      comments(first: 20) {
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

const UPDATE_RISK_MUTATION = graphql`
  mutation RiskDetailUpdateRiskMutation($id: ID!, $input: UpdateRiskInput!) {
    updateRisk(id: $id, input: $input) {
      risk {
        id
        title
        description
        scenario
        category
        source
        status
        inherentLikelihood
        inherentImpact
        residualLikelihood
        residualImpact
        ownerId
      }
    }
  }
`

const ADD_TREATMENT_MUTATION = graphql`
  mutation RiskDetailAddTreatmentMutation($riskId: ID!, $input: AddRiskTreatmentInput!) {
    addRiskTreatment(riskId: $riskId, input: $input) {
      treatment {
        id
        action
        responsible {
          id
          displayName
        }
        deadline
        status
        createdAt
      }
    }
  }
`

const UPDATE_TREATMENT_MUTATION = graphql`
  mutation RiskDetailUpdateTreatmentMutation($id: ID!, $input: UpdateRiskTreatmentInput!) {
    updateRiskTreatment(id: $id, input: $input) {
      treatment {
        id
        status
      }
    }
  }
`

const ADD_COMMENT_MUTATION = graphql`
  mutation RiskDetailAddCommentMutation($riskId: ID!, $body: String!) {
    addRiskComment(riskId: $riskId, body: $body) {
      comment {
        id
        body
        author {
          id
          displayName
        }
        createdAt
      }
    }
  }
`

const UPLOAD_EVIDENCE_MUTATION = graphql`
  mutation RiskDetailUploadEvidenceMutation($riskId: ID!, $file: Upload!) {
    uploadRiskEvidence(riskId: $riskId, file: $file) {
      evidence {
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
  }
`

type TabKey = 'details' | 'treatments' | 'controls' | 'comments' | 'evidence'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'controls', label: 'Controls' },
  { key: 'comments', label: 'Comments' },
  { key: 'evidence', label: 'Evidence' },
]

const TREATMENT_STATUSES = ['open', 'in_progress', 'completed', 'closed']

function getLevelColor(level: number): string {
  if (level >= 15) return 'bg-red-100 text-red-800 border-red-200'
  if (level >= 10) return 'bg-orange-100 text-orange-800 border-orange-200'
  if (level >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

function getLevelLabel(level: number): string {
  if (level >= 15) return 'Critical'
  if (level >= 10) return 'High'
  if (level >= 5) return 'Medium'
  return 'Low'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function RiskDetailContent() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)

  const data = useLazyLoadQuery<any>(RISK_DETAIL_QUERY, { id: id! })
  const risk = data.risk

  const [commitUpdate, isUpdating] = useMutation(UPDATE_RISK_MUTATION)
  const [commitAddTreatment, isAddingTreatment] = useMutation(ADD_TREATMENT_MUTATION)
  const [commitUpdateTreatment] = useMutation(UPDATE_TREATMENT_MUTATION)
  const [commitAddComment] = useMutation(ADD_COMMENT_MUTATION)
  const [commitUploadEvidence] = useMutation(UPLOAD_EVIDENCE_MUTATION)

  const [editForm, setEditForm] = useState({
    title: risk?.title ?? '',
    description: risk?.description ?? '',
    scenario: risk?.scenario ?? '',
    category: risk?.category ?? 'information_security',
    source: risk?.source ?? '',
    status: risk?.status ?? 'identified',
    inherentLikelihood: risk?.inherentLikelihood ?? 3,
    inherentImpact: risk?.inherentImpact ?? 3,
    residualLikelihood: risk?.residualLikelihood ?? 1,
    residualImpact: risk?.residualImpact ?? 1,
  })

  const [treatmentForm, setTreatmentForm] = useState({
    action: '',
    responsibleId: '',
    deadline: '',
  })

  if (!risk) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Risk not found.</p>
      </div>
    )
  }

  const treatments = risk.treatments ?? []
  const controls = risk.controls ?? []
  const comments = (risk.comments?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )
  const evidence = (risk.evidence?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )

  const handleUpdateRisk = () => {
    commitUpdate({
      variables: {
        id: risk.id,
        input: {
          title: editForm.title.trim(),
          description: editForm.description.trim() || undefined,
          scenario: editForm.scenario.trim() || undefined,
          category: editForm.category,
          source: editForm.source.trim() || undefined,
          status: editForm.status,
          inherentLikelihood: editForm.inherentLikelihood,
          inherentImpact: editForm.inherentImpact,
          residualLikelihood: editForm.residualLikelihood,
          residualImpact: editForm.residualImpact,
        },
      },
      onCompleted: () => setShowEditModal(false),
      onError: (err) => console.error('Failed to update risk:', err),
    })
  }

  const handleAddTreatment = () => {
    if (!treatmentForm.action.trim()) return
    commitAddTreatment({
      variables: {
        riskId: risk.id,
        input: {
          action: treatmentForm.action.trim(),
          responsibleId: treatmentForm.responsibleId.trim() || undefined,
          deadline: treatmentForm.deadline || undefined,
        },
      },
      onCompleted: () => {
        setShowTreatmentModal(false)
        setTreatmentForm({ action: '', responsibleId: '', deadline: '' })
      },
      onError: (err) => console.error('Failed to add treatment:', err),
    })
  }

  const handleTreatmentStatusChange = (treatmentId: string, newStatus: string) => {
    commitUpdateTreatment({
      variables: {
        id: treatmentId,
        input: { status: newStatus },
      },
      onError: (err) => console.error('Failed to update treatment status:', err),
    })
  }

  const handleAddComment = (body: string) => {
    commitAddComment({
      variables: { riskId: risk.id, body },
      onError: (err) => console.error('Failed to add comment:', err),
    })
  }

  const handleUploadEvidence = (file: File) => {
    commitUploadEvidence({
      variables: { riskId: risk.id, file },
      onError: (err) => console.error('Failed to upload evidence:', err),
    })
  }

  const treatmentColumns = [
    {
      key: 'action',
      header: 'Action',
      render: (t: any) => (
        <span className="text-sm text-gray-900">{t.action}</span>
      ),
    },
    {
      key: 'responsible',
      header: 'Responsible',
      render: (t: any) => t.responsible?.displayName ?? '--',
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (t: any) =>
        t.deadline ? new Date(t.deadline).toLocaleDateString() : '--',
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: any) => (
        <select
          value={t.status}
          onChange={(e) => handleTreatmentStatusChange(t.id, e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {TREATMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (t: any) => new Date(t.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              to="/grc/risks"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Risk Register
            </Link>
            <span className="text-sm text-gray-400">/</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{risk.title}</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditForm({
                title: risk.title,
                description: risk.description ?? '',
                scenario: risk.scenario ?? '',
                category: risk.category,
                source: risk.source ?? '',
                status: risk.status,
                inherentLikelihood: risk.inherentLikelihood,
                inherentImpact: risk.inherentImpact,
                residualLikelihood: risk.residualLikelihood,
                residualImpact: risk.residualImpact,
              })
              setShowEditModal(true)
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`border-b-2 px-1 py-3 text-sm font-medium ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {risk.description || 'No description provided.'}
                </p>
              </div>

              {/* Scenario */}
              {risk.scenario && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Scenario
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {risk.scenario}
                  </p>
                </div>
              )}

              {/* Risk Assessment Comparison */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Risk Assessment
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Inherent Risk */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
                      Inherent Risk
                    </h4>
                    <div
                      className={`mb-3 inline-flex items-center rounded-lg border px-3 py-2 text-lg font-bold ${getLevelColor(risk.calculatedInherentLevel)}`}
                    >
                      {risk.calculatedInherentLevel}{' '}
                      <span className="ml-2 text-sm font-medium">
                        ({getLevelLabel(risk.calculatedInherentLevel)})
                      </span>
                    </div>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-500">Likelihood</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {risk.inherentLikelihood}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-500">Impact</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {risk.inherentImpact}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Residual Risk */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">
                      Residual Risk
                    </h4>
                    <div
                      className={`mb-3 inline-flex items-center rounded-lg border px-3 py-2 text-lg font-bold ${getLevelColor(risk.calculatedResidualLevel)}`}
                    >
                      {risk.calculatedResidualLevel}{' '}
                      <span className="ml-2 text-sm font-medium">
                        ({getLevelLabel(risk.calculatedResidualLevel)})
                      </span>
                    </div>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-500">Likelihood</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {risk.residualLikelihood}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-500">Impact</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {risk.residualImpact}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Treatments Tab */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Treatment Actions ({treatments.length})
                </h3>
                <button
                  onClick={() => setShowTreatmentModal(true)}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Add Treatment
                </button>
              </div>
              <DataTable
                columns={treatmentColumns}
                data={treatments}
                keyExtractor={(t: any) => t.id}
                emptyMessage="No treatment actions yet."
              />
            </div>
          )}

          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Linked ISO Controls ({controls.length})
              </h3>
              {controls.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    No controls linked to this risk.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {controls.map((rc: any) => (
                    <div
                      key={rc.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700">
                          {rc.control.controlId}
                        </span>
                        <Link
                          to={`/grc/iso-controls/${rc.control.controlId}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {rc.control.name}
                        </Link>
                      </div>
                      <StatusBadge status={rc.implementationStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Comments ({risk.comments?.totalCount ?? 0})
              </h3>
              <CommentThread
                comments={comments.map((c: any) => ({
                  id: c.id,
                  authorName: c.author?.displayName ?? 'Unknown',
                  body: c.body,
                  createdAt: c.createdAt,
                }))}
                onAdd={handleAddComment}
              />
            </div>
          )}

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Evidence ({risk.evidence?.totalCount ?? 0})
              </h3>
              <FileUpload onUpload={handleUploadEvidence} />
              {evidence.length === 0 ? (
                <p className="text-sm text-gray-500">No evidence uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((e: any) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {e.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(e.fileSize)} &middot; {e.contentType}{' '}
                            &middot; Uploaded by {e.uploadedBy?.displayName ?? 'Unknown'}{' '}
                            on {new Date(e.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Risk Assessment Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Risk Assessment
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={risk.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {risk.category
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </dd>
              </div>
              {risk.source && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{risk.source}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Inherent Level
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLevelColor(risk.calculatedInherentLevel)}`}
                  >
                    {risk.calculatedInherentLevel} (
                    {getLevelLabel(risk.calculatedInherentLevel)})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Residual Level
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLevelColor(risk.calculatedResidualLevel)}`}
                  >
                    {risk.calculatedResidualLevel} (
                    {getLevelLabel(risk.calculatedResidualLevel)})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {risk.owner?.displayName ?? '--'}
                  {risk.owner?.email && (
                    <span className="block text-xs text-gray-500">
                      {risk.owner.email}
                    </span>
                  )}
                </dd>
              </div>
              {risk.approver && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Approver
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {risk.approver.displayName}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Review Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {risk.reviewDate
                    ? new Date(risk.reviewDate).toLocaleDateString()
                    : '--'}
                </dd>
              </div>
              {risk.lastReviewedBy && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Last Reviewed By
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {risk.lastReviewedBy.displayName}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Metadata
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(risk.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(risk.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Risk Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Risk"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowEditModal(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRisk}
              disabled={!editForm.title.trim() || isUpdating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Scenario
            </label>
            <textarea
              value={editForm.scenario}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, scenario: e.target.value }))
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="information_security">
                  Information Security
                </option>
                <option value="compliance">Compliance</option>
                <option value="operational">Operational</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="identified">Identified</option>
                <option value="assessed">Assessed</option>
                <option value="accepted">Accepted</option>
                <option value="mitigated">Mitigated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inherent Likelihood
              </label>
              <select
                value={editForm.inherentLikelihood}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    inherentLikelihood: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inherent Impact
              </label>
              <select
                value={editForm.inherentImpact}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    inherentImpact: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Residual Likelihood
              </label>
              <select
                value={editForm.residualLikelihood}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    residualLikelihood: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Residual Impact
              </label>
              <select
                value={editForm.residualImpact}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    residualImpact: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source
            </label>
            <input
              type="text"
              value={editForm.source}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, source: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </Modal>

      {/* Add Treatment Modal */}
      <Modal
        isOpen={showTreatmentModal}
        onClose={() => setShowTreatmentModal(false)}
        title="Add Treatment Action"
        footer={
          <>
            <button
              onClick={() => setShowTreatmentModal(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTreatment}
              disabled={!treatmentForm.action.trim() || isAddingTreatment}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isAddingTreatment ? 'Adding...' : 'Add Treatment'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Action <span className="text-red-500">*</span>
            </label>
            <textarea
              value={treatmentForm.action}
              onChange={(e) =>
                setTreatmentForm((prev) => ({
                  ...prev,
                  action: e.target.value,
                }))
              }
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Describe the treatment action"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Responsible (User ID)
            </label>
            <input
              type="text"
              value={treatmentForm.responsibleId}
              onChange={(e) =>
                setTreatmentForm((prev) => ({
                  ...prev,
                  responsibleId: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="User ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deadline
            </label>
            <input
              type="date"
              value={treatmentForm.deadline}
              onChange={(e) =>
                setTreatmentForm((prev) => ({
                  ...prev,
                  deadline: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function RiskDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <RiskDetailContent />
    </Suspense>
  )
}
