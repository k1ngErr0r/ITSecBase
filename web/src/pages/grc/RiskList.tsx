import { Suspense, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import HeatmapGrid from '../../components/common/HeatmapGrid'
import DataTable from '../../components/common/DataTable'
import FilterBar from '../../components/common/FilterBar'
import Pagination from '../../components/common/Pagination'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'

const PAGE_SIZE = 25

const RISK_LIST_QUERY = graphql`
  query RiskListQuery($first: Int, $after: String, $filter: RiskFilter) {
    risks(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          title
          category
          status
          inherentLikelihood
          inherentImpact
          calculatedInherentLevel
          residualLikelihood
          residualImpact
          calculatedResidualLevel
          owner {
            id
            displayName
          }
          reviewDate
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
    riskPosture {
      heatmapData {
        likelihood
        impact
        count
      }
    }
    riskMatrixConfig {
      likelihoodLabels
      impactLabels
    }
  }
`

const CREATE_RISK_MUTATION = graphql`
  mutation RiskListCreateRiskMutation($input: CreateRiskInput!) {
    createRisk(input: $input) {
      risk {
        id
        title
        category
        status
        inherentLikelihood
        inherentImpact
        calculatedInherentLevel
        owner {
          id
          displayName
        }
      }
    }
  }
`

interface RiskNode {
  id: string
  title: string
  category: string
  status: string
  inherentLikelihood: number
  inherentImpact: number
  calculatedInherentLevel: number
  residualLikelihood: number
  residualImpact: number
  calculatedResidualLevel: number
  owner: { id: string; displayName: string } | null
  reviewDate: string | null
}

const CATEGORY_OPTIONS = [
  { value: 'information_security', label: 'Information Security' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'operational', label: 'Operational' },
]

const STATUS_OPTIONS = [
  { value: 'identified', label: 'Identified' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
]

const FILTER_FIELDS = [
  {
    key: 'category',
    label: 'All Categories',
    type: 'select' as const,
    options: CATEGORY_OPTIONS,
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
    placeholder: 'Search risks...',
  },
]

function getLevelColor(level: number): string {
  if (level >= 15) return 'text-red-700 bg-red-100'
  if (level >= 10) return 'text-orange-700 bg-orange-100'
  if (level >= 5) return 'text-yellow-700 bg-yellow-100'
  return 'text-green-700 bg-green-100'
}

function RiskListContent() {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    category: '',
    status: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [afterCursor, setAfterCursor] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scenario: '',
    category: 'information_security',
    source: '',
    inherentLikelihood: 3,
    inherentImpact: 3,
    ownerId: '',
  })

  const buildFilter = useCallback(() => {
    const filter: Record<string, unknown> = {}
    if (filterValues.category) filter.category = filterValues.category
    if (filterValues.status) filter.status = filterValues.status
    if (filterValues.search) filter.search = filterValues.search
    return Object.keys(filter).length > 0 ? filter : undefined
  }, [filterValues])

  const data = useLazyLoadQuery<any>(RISK_LIST_QUERY, {
    first: PAGE_SIZE,
    after: afterCursor,
    filter: buildFilter(),
  })

  const [commitCreate, isCreating] = useMutation(CREATE_RISK_MUTATION)

  const risks: RiskNode[] = (data.risks?.edges ?? []).map(
    (edge: { node: RiskNode }) => edge.node,
  )
  const pageInfo = data.risks?.pageInfo
  const totalCount = data.risks?.totalCount ?? 0
  const heatmapData = data.riskPosture?.heatmapData ?? []
  const matrixConfig = data.riskMatrixConfig

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    setAfterCursor(null)
  }

  const handleClearFilters = () => {
    setFilterValues({ category: '', status: '', search: '' })
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

  const handleCreateRisk = () => {
    if (!formData.title.trim()) return
    commitCreate({
      variables: {
        input: {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          scenario: formData.scenario.trim() || undefined,
          category: formData.category,
          source: formData.source.trim() || undefined,
          inherentLikelihood: formData.inherentLikelihood,
          inherentImpact: formData.inherentImpact,
          ownerId: formData.ownerId.trim() || undefined,
        },
      },
      onCompleted: () => {
        setShowAddModal(false)
        setFormData({
          title: '',
          description: '',
          scenario: '',
          category: 'information_security',
          source: '',
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: '',
        })
      },
      onError: (error) => {
        console.error('Failed to create risk:', error)
      },
    })
  }

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (risk: RiskNode) => (
        <Link
          to={`/grc/risks/${risk.id}`}
          className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
        >
          {risk.title}
        </Link>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (risk: RiskNode) =>
        risk.category
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    {
      key: 'calculatedInherentLevel',
      header: 'Inherent Level',
      sortable: true,
      render: (risk: RiskNode) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLevelColor(risk.calculatedInherentLevel)}`}
        >
          {risk.calculatedInherentLevel}
        </span>
      ),
    },
    {
      key: 'calculatedResidualLevel',
      header: 'Residual Level',
      sortable: true,
      render: (risk: RiskNode) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getLevelColor(risk.calculatedResidualLevel)}`}
        >
          {risk.calculatedResidualLevel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (risk: RiskNode) => <StatusBadge status={risk.status} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (risk: RiskNode) => risk.owner?.displayName ?? '--',
    },
    {
      key: 'reviewDate',
      header: 'Review Date',
      sortable: true,
      render: (risk: RiskNode) =>
        risk.reviewDate
          ? new Date(risk.reviewDate).toLocaleDateString()
          : '--',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Risk Register</h1>
        <div className="flex gap-3">
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Add Risk
          </button>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Risk Heatmap
        </h2>
        <HeatmapGrid
          data={heatmapData}
          likelihoodLabels={matrixConfig?.likelihoodLabels}
          impactLabels={matrixConfig?.impactLabels}
        />
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
        data={risks}
        keyExtractor={(risk) => risk.id}
        emptyMessage="No risks yet."
        emptyAction={{ label: 'Add your first risk', href: '#' }}
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

      {/* Add Risk Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Risk"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowAddModal(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRisk}
              disabled={!formData.title.trim() || isCreating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Risk'}
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
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Risk title"
            />
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
              placeholder="Describe the risk"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Scenario
            </label>
            <textarea
              value={formData.scenario}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, scenario: e.target.value }))
              }
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Risk scenario"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Source
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, source: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., audit, assessment"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inherent Likelihood (1-5)
              </label>
              <select
                value={formData.inherentLikelihood}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    inherentLikelihood: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={1}>1 - Rare</option>
                <option value={2}>2 - Unlikely</option>
                <option value={3}>3 - Possible</option>
                <option value={4}>4 - Likely</option>
                <option value={5}>5 - Almost Certain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inherent Impact (1-5)
              </label>
              <select
                value={formData.inherentImpact}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    inherentImpact: Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={1}>1 - Negligible</option>
                <option value={2}>2 - Minor</option>
                <option value={3}>3 - Moderate</option>
                <option value={4}>4 - Major</option>
                <option value={5}>5 - Severe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Owner ID
            </label>
            <input
              type="text"
              value={formData.ownerId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ownerId: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="User ID of the risk owner"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function RiskList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <RiskListContent />
    </Suspense>
  )
}
