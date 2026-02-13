import { Suspense, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import DataTable from '../../components/common/DataTable'
import CommentThread from '../../components/common/CommentThread'
import FileUpload from '../../components/common/FileUpload'

const INCIDENT_DETAIL_QUERY = graphql`
  query IncidentDetailQuery($id: ID!) {
    incident(id: $id) {
      id
      name
      area
      description
      impactSummary
      impactRating
      classification
      regulatoryBreach
      reporter {
        id
        displayName
      }
      owner {
        id
        displayName
        email
      }
      status
      rootCause
      rootCauseCategory
      correctiveActions
      preventiveActions
      detectedAt
      openedAt
      containedAt
      resolvedAt
      closedAt
      slaDeadline
      createdAt
      updatedAt
      actions {
        id
        actionType
        description
        owner {
          id
          displayName
        }
        dueDate
        status
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
      vulnerabilities(first: 20) {
        edges {
          node {
            id
            title
            severity
          }
        }
        totalCount
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

const UPDATE_INCIDENT_STATUS_MUTATION = graphql`
  mutation IncidentDetailUpdateStatusMutation($id: ID!, $input: UpdateIncidentInput!) {
    updateIncident(id: $id, input: $input) {
      id
      status
      containedAt
      resolvedAt
      closedAt
    }
  }
`

const ADD_ACTION_MUTATION = graphql`
  mutation IncidentDetailAddActionMutation($incidentId: ID!, $input: AddIncidentActionInput!) {
    addIncidentAction(incidentId: $incidentId, input: $input) {
      id
      actionType
      description
      owner {
        id
        displayName
      }
      dueDate
      status
      createdAt
    }
  }
`

const UPDATE_ACTION_MUTATION = graphql`
  mutation IncidentDetailUpdateActionMutation($id: ID!, $input: UpdateIncidentActionInput!) {
    updateIncidentAction(id: $id, input: $input) {
      id
      status
    }
  }
`

const ADD_COMMENT_MUTATION = graphql`
  mutation IncidentDetailAddCommentMutation($input: AddCommentInput!) {
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

const UPLOAD_EVIDENCE_MUTATION = graphql`
  mutation IncidentDetailUploadEvidenceMutation($input: AddEvidenceInput!) {
    addEvidence(input: $input) {
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
`

type TabKey = 'details' | 'actions' | 'assets' | 'vulnerabilities' | 'comments' | 'evidence'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'actions', label: 'Actions' },
  { key: 'assets', label: 'Assets' },
  { key: 'vulnerabilities', label: 'Vulnerabilities' },
  { key: 'comments', label: 'Comments' },
  { key: 'evidence', label: 'Evidence' },
]

const STATUS_WORKFLOW = [
  'new',
  'triage',
  'containment',
  'eradication',
  'recovery',
  'lessons_learned',
  'closed',
]

const ACTION_STATUSES = ['open', 'in_progress', 'completed', 'closed']

const ACTION_TYPES = [
  { value: 'corrective', label: 'Corrective' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'containment', label: 'Containment' },
  { value: 'recovery', label: 'Recovery' },
]

interface TimelineEvent {
  label: string
  date: string | null
  color: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function IncidentDetailContent() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionForm, setActionForm] = useState({
    actionType: 'corrective',
    description: '',
    ownerId: '',
    dueDate: '',
  })

  const data = useLazyLoadQuery<any>(INCIDENT_DETAIL_QUERY, { id: id! })
  const incident = data.incident

  const [commitUpdateStatus, isUpdatingStatus] = useMutation(UPDATE_INCIDENT_STATUS_MUTATION)
  const [commitAddAction, isAddingAction] = useMutation(ADD_ACTION_MUTATION)
  const [commitUpdateAction] = useMutation(UPDATE_ACTION_MUTATION)
  const [commitAddComment] = useMutation(ADD_COMMENT_MUTATION)
  const [commitUploadEvidence] = useMutation(UPLOAD_EVIDENCE_MUTATION)

  if (!incident) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Incident not found.</p>
      </div>
    )
  }

  const actions = incident.actions ?? []
  const assets = (incident.assets?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )
  const vulnerabilities = (incident.vulnerabilities?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )
  const comments = (incident.comments?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )
  const evidence = (incident.evidence?.edges ?? []).map(
    (edge: { node: any }) => edge.node,
  )

  // Timeline events
  const timelineEvents: TimelineEvent[] = [
    { label: 'Detected', date: incident.detectedAt, color: 'bg-blue-500' },
    { label: 'Opened', date: incident.openedAt, color: 'bg-indigo-500' },
    { label: 'Contained', date: incident.containedAt, color: 'bg-orange-500' },
    { label: 'Resolved', date: incident.resolvedAt, color: 'bg-green-500' },
    { label: 'Closed', date: incident.closedAt, color: 'bg-gray-500' },
  ]

  // Next status in workflow
  const currentStatusIndex = STATUS_WORKFLOW.indexOf(incident.status)
  const nextStatus =
    currentStatusIndex >= 0 && currentStatusIndex < STATUS_WORKFLOW.length - 1
      ? STATUS_WORKFLOW[currentStatusIndex + 1]
      : null

  const handleAdvanceStatus = () => {
    if (!nextStatus) return
    commitUpdateStatus({
      variables: {
        id: incident.id,
        input: { status: nextStatus },
      },
      onError: (err) => console.error('Failed to update status:', err),
    })
  }

  const handleAddAction = () => {
    if (!actionForm.description.trim()) return
    commitAddAction({
      variables: {
        incidentId: incident.id,
        input: {
          actionType: actionForm.actionType,
          description: actionForm.description.trim(),
          ownerId: actionForm.ownerId.trim() || undefined,
          dueDate: actionForm.dueDate || undefined,
        },
      },
      onCompleted: () => {
        setShowActionModal(false)
        setActionForm({
          actionType: 'corrective',
          description: '',
          ownerId: '',
          dueDate: '',
        })
      },
      onError: (err) => console.error('Failed to add action:', err),
    })
  }

  const handleActionStatusChange = (actionId: string, newStatus: string) => {
    commitUpdateAction({
      variables: {
        id: actionId,
        input: { status: newStatus },
      },
      onError: (err) => console.error('Failed to update action status:', err),
    })
  }

  const handleAddComment = (body: string) => {
    commitAddComment({
      variables: { input: { entityType: 'incident', entityId: incident.id, body } },
      onError: (err) => console.error('Failed to add comment:', err),
    })
  }

  const handleUploadEvidence = (file: File) => {
    commitUploadEvidence({
      variables: { input: { entityType: 'incident', entityId: incident.id, fileName: file.name, fileSize: file.size, contentType: file.type } },
      onError: (err) => console.error('Failed to upload evidence:', err),
    })
  }

  const actionColumns = [
    {
      key: 'actionType',
      header: 'Type',
      render: (a: any) => (
        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {a.actionType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (a: any) => (
        <span className="text-sm text-gray-900">{a.description}</span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (a: any) => a.owner?.displayName ?? '--',
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (a: any) => {
        if (!a.dueDate) return '--'
        const due = new Date(a.dueDate)
        const isOverdue = due < new Date() && a.status !== 'completed' && a.status !== 'closed'
        return (
          <span className={isOverdue ? 'font-medium text-red-600' : ''}>
            {due.toLocaleDateString()}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: any) => (
        <select
          value={a.status}
          onChange={(e) => handleActionStatusChange(a.id, e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {ACTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </option>
          ))}
        </select>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              to="/grc/incidents"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Incidents
            </Link>
            <span className="text-sm text-gray-400">/</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{incident.name}</h1>
        </div>
        <div className="flex gap-3">
          {nextStatus && (
            <button
              onClick={handleAdvanceStatus}
              disabled={isUpdatingStatus}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isUpdatingStatus
                ? 'Updating...'
                : `Advance to ${nextStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`}
            </button>
          )}
        </div>
      </div>

      {/* Event Timeline */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Event Timeline
        </h3>
        <div className="flex items-start justify-between">
          {timelineEvents.map((event, idx) => {
            const isCompleted = !!event.date
            const isLast = idx === timelineEvents.length - 1
            return (
              <div key={event.label} className="flex flex-1 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                      isCompleted ? event.color : 'bg-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-xs font-medium ${
                        isCompleted ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {event.label}
                    </p>
                    {event.date && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    )}
                    {event.date && (
                      <p className="text-xs text-gray-400">
                        {new Date(event.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={`mt-4 h-0.5 flex-1 ${
                      isCompleted && timelineEvents[idx + 1]?.date
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
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
                  {incident.description || 'No description provided.'}
                </p>
              </div>

              {/* Impact Summary */}
              {incident.impactSummary && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Impact Summary
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {incident.impactSummary}
                  </p>
                </div>
              )}

              {/* Root Cause */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Root Cause Analysis
                </h3>
                {incident.rootCauseCategory && (
                  <div className="mb-2">
                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {incident.rootCauseCategory
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {incident.rootCause || 'Root cause not yet determined.'}
                </p>
              </div>

              {/* Corrective & Preventive Actions */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Corrective Actions
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {incident.correctiveActions || 'None documented.'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Preventive Actions
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {incident.preventiveActions || 'None documented.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Incident Actions ({actions.length})
                </h3>
                <button
                  onClick={() => setShowActionModal(true)}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Add Action
                </button>
              </div>
              <DataTable
                columns={actionColumns}
                data={actions}
                keyExtractor={(a: any) => a.id}
                emptyMessage="No actions recorded yet."
              />
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Affected Assets ({incident.assets?.totalCount ?? 0})
              </h3>
              {assets.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    No assets linked to this incident.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.map((asset: any) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/assets/${asset.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {asset.name}
                        </Link>
                      </div>
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {asset.assetType
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === 'vulnerabilities' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Related Vulnerabilities (
                {incident.vulnerabilities?.totalCount ?? 0})
              </h3>
              {vulnerabilities.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    No vulnerabilities linked to this incident.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vulnerabilities.map((vuln: any) => (
                    <div
                      key={vuln.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <Link
                        to={`/vulnerabilities/${vuln.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {vuln.title}
                      </Link>
                      <StatusBadge status={vuln.severity} variant="severity" />
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
                Comments ({incident.comments?.totalCount ?? 0})
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
                Evidence ({incident.evidence?.totalCount ?? 0})
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
                            &middot; Uploaded by{' '}
                            {e.uploadedBy?.displayName ?? 'Unknown'} on{' '}
                            {new Date(e.createdAt).toLocaleDateString()}
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
          {/* Properties */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Properties
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Impact Rating
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    status={incident.impactRating}
                    variant="impact"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={incident.status} />
                </dd>
              </div>
              {incident.classification && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Classification
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {incident.classification
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </dd>
                </div>
              )}
              {incident.area && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Area</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {incident.area}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Regulatory Breach
                </dt>
                <dd className="mt-1">
                  {incident.regulatoryBreach ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      No
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {incident.owner?.displayName ?? '--'}
                  {incident.owner?.email && (
                    <span className="block text-xs text-gray-500">
                      {incident.owner.email}
                    </span>
                  )}
                </dd>
              </div>
              {incident.reporter && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Reporter
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {incident.reporter.displayName}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  SLA Deadline
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {incident.slaDeadline ? (
                    <>
                      {new Date(incident.slaDeadline).toLocaleString()}
                      {new Date(incident.slaDeadline) < new Date() &&
                        incident.status !== 'closed' && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Breached
                          </span>
                        )}
                    </>
                  ) : (
                    '--'
                  )}
                </dd>
              </div>
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
                  {new Date(incident.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(incident.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Add Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title="Add Incident Action"
        footer={
          <>
            <button
              onClick={() => setShowActionModal(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAction}
              disabled={!actionForm.description.trim() || isAddingAction}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isAddingAction ? 'Adding...' : 'Add Action'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Action Type <span className="text-red-500">*</span>
            </label>
            <select
              value={actionForm.actionType}
              onChange={(e) =>
                setActionForm((prev) => ({
                  ...prev,
                  actionType: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ACTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={actionForm.description}
              onChange={(e) =>
                setActionForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Describe the action to be taken"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Owner (User ID)
              </label>
              <input
                type="text"
                value={actionForm.ownerId}
                onChange={(e) =>
                  setActionForm((prev) => ({
                    ...prev,
                    ownerId: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="User ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                value={actionForm.dueDate}
                onChange={(e) =>
                  setActionForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function IncidentDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <IncidentDetailContent />
    </Suspense>
  )
}
