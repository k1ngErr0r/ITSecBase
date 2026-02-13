import { Suspense, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import DataTable from '../../components/common/DataTable'
import FilterBar from '../../components/common/FilterBar'
import Pagination from '../../components/common/Pagination'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'

const PAGE_SIZE = 25

const INCIDENT_LIST_QUERY = graphql`
  query IncidentListQuery($first: Int, $after: String, $filter: IncidentFilter) {
    incidents(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          area
          impactRating
          status
          owner {
            id
            displayName
          }
          openedAt
          slaDeadline
          classification
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
    incidentStatus {
      openByImpact {
        impact
        count
      }
      slaBreaches
    }
  }
`

const CREATE_INCIDENT_MUTATION = graphql`
  mutation IncidentListCreateIncidentMutation($input: CreateIncidentInput!) {
    createIncident(input: $input) {
      id
      name
      area
      impactRating
      status
      classification
      owner {
        id
        displayName
      }
      openedAt
      slaDeadline
    }
  }
`

interface IncidentNode {
  id: string
  name: string
  area: string | null
  impactRating: string
  status: string
  owner: { id: string; displayName: string } | null
  openedAt: string | null
  slaDeadline: string | null
  classification: string | null
}

const IMPACT_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'triage', label: 'Triage' },
  { value: 'containment', label: 'Containment' },
  { value: 'eradication', label: 'Eradication' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'lessons_learned', label: 'Lessons Learned' },
  { value: 'closed', label: 'Closed' },
]

const FILTER_FIELDS = [
  {
    key: 'impactRating',
    label: 'All Impact Levels',
    type: 'select' as const,
    options: IMPACT_OPTIONS,
  },
  {
    key: 'status',
    label: 'All Statuses',
    type: 'select' as const,
    options: STATUS_OPTIONS,
  },
  {
    key: 'search',
    label: 'Search',
    type: 'search' as const,
    placeholder: 'Search incidents...',
  },
]

function getImpactCardColor(impact: string): string {
  switch (impact) {
    case 'critical':
      return 'text-red-600'
    case 'high':
      return 'text-orange-600'
    case 'medium':
      return 'text-yellow-600'
    case 'low':
      return 'text-green-600'
    default:
      return 'text-gray-900'
  }
}

function IncidentListContent() {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    impactRating: '',
    status: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [afterCursor, setAfterCursor] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    description: '',
    impactSummary: '',
    impactRating: 'medium',
    classification: '',
    detectedAt: '',
    slaDeadline: '',
  })

  const buildFilter = useCallback(() => {
    const filter: Record<string, unknown> = {}
    if (filterValues.impactRating) filter.impactRating = filterValues.impactRating
    if (filterValues.status) filter.status = filterValues.status
    if (filterValues.search) filter.search = filterValues.search
    return Object.keys(filter).length > 0 ? filter : undefined
  }, [filterValues])

  const data = useLazyLoadQuery<any>(INCIDENT_LIST_QUERY, {
    first: PAGE_SIZE,
    after: afterCursor,
    filter: buildFilter(),
  })

  const [commitCreate, isCreating] = useMutation(CREATE_INCIDENT_MUTATION)

  const incidents: IncidentNode[] = (data.incidents?.edges ?? []).map(
    (edge: { node: IncidentNode }) => edge.node,
  )
  const pageInfo = data.incidents?.pageInfo
  const totalCount = data.incidents?.totalCount ?? 0
  const openByImpact = data.incidentStatus?.openByImpact ?? []
  const slaBreaches = data.incidentStatus?.slaBreaches ?? 0

  const getImpactCount = (impact: string): number => {
    const entry = openByImpact.find((e: any) => e.impact === impact)
    return entry?.count ?? 0
  }

  const totalOpen = openByImpact.reduce(
    (sum: number, e: any) => sum + (e.count ?? 0),
    0,
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    setAfterCursor(null)
  }

  const handleClearFilters = () => {
    setFilterValues({ impactRating: '', status: '', search: '' })
    setCurrentPage(1)
    setAfterCursor(null)
  }

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage) {
      setAfterCursor(pageInfo.endCursor)
      setCurrentPage((p) => p + 1)
    }
  }

  const handlePreviousPage = () => {
    if (pageInfo?.hasPreviousPage && currentPage > 1) {
      setAfterCursor(pageInfo.startCursor)
      setCurrentPage((p) => p - 1)
    }
  }

  const handleCreateIncident = () => {
    if (!formData.name.trim()) return
    commitCreate({
      variables: {
        input: {
          name: formData.name.trim(),
          area: formData.area.trim() || undefined,
          description: formData.description.trim() || undefined,
          impactSummary: formData.impactSummary.trim() || undefined,
          impactRating: formData.impactRating,
          classification: formData.classification.trim() || undefined,
          detectedAt: formData.detectedAt || undefined,
          slaDeadline: formData.slaDeadline || undefined,
        },
      },
      onCompleted: () => {
        setShowReportModal(false)
        setFormData({
          name: '',
          area: '',
          description: '',
          impactSummary: '',
          impactRating: 'medium',
          classification: '',
          detectedAt: '',
          slaDeadline: '',
        })
      },
      onError: (error) => {
        console.error('Failed to create incident:', error)
      },
    })
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (incident: IncidentNode) => (
        <Link
          to={`/grc/incidents/${incident.id}`}
          className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
        >
          {incident.name}
        </Link>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (incident: IncidentNode) => incident.area ?? '--',
    },
    {
      key: 'impactRating',
      header: 'Impact Rating',
      render: (incident: IncidentNode) => (
        <StatusBadge status={incident.impactRating} variant="impact" />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (incident: IncidentNode) => (
        <StatusBadge status={incident.status} />
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (incident: IncidentNode) =>
        incident.owner?.displayName ?? '--',
    },
    {
      key: 'openedAt',
      header: 'Opened At',
      sortable: true,
      render: (incident: IncidentNode) =>
        incident.openedAt
          ? new Date(incident.openedAt).toLocaleDateString()
          : '--',
    },
    {
      key: 'slaDeadline',
      header: 'SLA Deadline',
      sortable: true,
      render: (incident: IncidentNode) => {
        if (!incident.slaDeadline) return '--'
        const deadline = new Date(incident.slaDeadline)
        const isOverdue = deadline < new Date() && incident.status !== 'closed'
        return (
          <span className={isOverdue ? 'font-medium text-red-600' : ''}>
            {deadline.toLocaleDateString()}
            {isOverdue && (
              <span className="ml-1 text-xs text-red-500">Overdue</span>
            )}
          </span>
        )
      },
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Report Incident
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Total Open
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalOpen}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Critical
          </p>
          <p className={`mt-1 text-2xl font-bold ${getImpactCardColor('critical')}`}>
            {getImpactCount('critical')}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">High</p>
          <p className={`mt-1 text-2xl font-bold ${getImpactCardColor('high')}`}>
            {getImpactCount('high')}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Medium / Low
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {getImpactCount('medium') + getImpactCount('low')}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            SLA Breaches
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            {slaBreaches}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={FILTER_FIELDS}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={incidents}
        keyExtractor={(incident) => incident.id}
        emptyMessage="No incidents recorded."
        emptyAction={{ label: 'Report an incident', href: '#' }}
      />

      {/* Pagination */}
      <Pagination
        hasNextPage={pageInfo?.hasNextPage ?? false}
        hasPreviousPage={pageInfo?.hasPreviousPage ?? false}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
      />

      {/* Report Incident Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Incident"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowReportModal(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateIncident}
              disabled={!formData.name.trim() || isCreating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isCreating ? 'Submitting...' : 'Report Incident'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Incident name / title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Area
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, area: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Network, Application"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Impact Rating
              </label>
              <select
                value={formData.impactRating}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    impactRating: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {IMPACT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Describe what happened"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Impact Summary
            </label>
            <textarea
              value={formData.impactSummary}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  impactSummary: e.target.value,
                }))
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Summarize the business impact"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Classification
              </label>
              <input
                type="text"
                value={formData.classification}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    classification: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., data_breach, malware"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Detected At
              </label>
              <input
                type="datetime-local"
                value={formData.detectedAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    detectedAt: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              SLA Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.slaDeadline}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  slaDeadline: e.target.value,
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

export default function IncidentList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <IncidentListContent />
    </Suspense>
  )
}
