import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { Link } from 'react-router-dom'
import { StatusBadge, Modal, Pagination } from '../../components/common'
import { usePagination } from '../../hooks/usePagination'
import { useFilters } from '../../hooks/useFilters'

const DrPlanListQuery = graphql`
  query DrPlanListQuery($first: Int, $after: String, $filter: DrPlanFilter) {
    drPlans(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          scope
          version
          rtoMinutes
          rpoMinutes
          status
          owner {
            id
            displayName
          }
          createdAt
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
    drReadiness {
      nextTestDate
      lastTestDate
      lastTestResult
    }
  }
`

const CreateDrPlanMutation = graphql`
  mutation DrPlanListCreateMutation($input: CreateDrPlanInput!) {
    createDrPlan(input: $input) {
      id
      name
      status
    }
  }
`

function DrPlanListContent() {
  const { filters, updateFilter } = useFilters({ status: '', search: '' })
  const pagination = usePagination()
  const [showCreate, setShowCreate] = useState(false)
  const [commitCreate, creating] = useMutation(CreateDrPlanMutation)

  const [form, setForm] = useState({
    name: '',
    scope: '',
    version: '',
    rtoMinutes: '',
    rpoMinutes: '',
    playbook: '',
  })

  const filter: Record<string, any> = {}
  if (filters.status) filter.status = filters.status
  if (filters.search) filter.search = filters.search

  const data = useLazyLoadQuery<any>(DrPlanListQuery, {
    first: pagination.pageSize,
    after: pagination.after,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  })

  const plans = data.drPlans
  const dr = data.drReadiness
  const activePlans = plans.edges.filter(
    (e: any) => e.node.status === 'active',
  ).length

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
    if (m < 60) return `${m}m`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    commitCreate({
      variables: {
        input: {
          name: form.name,
          scope: form.scope || undefined,
          version: form.version || undefined,
          rtoMinutes: form.rtoMinutes ? parseInt(form.rtoMinutes) : undefined,
          rpoMinutes: form.rpoMinutes ? parseInt(form.rpoMinutes) : undefined,
          playbook: form.playbook || undefined,
        },
      },
      onCompleted: () => {
        setShowCreate(false)
        setForm({ name: '', scope: '', version: '', rtoMinutes: '', rpoMinutes: '', playbook: '' })
      },
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Disaster Recovery Plans
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Add DR Plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Active Plans
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activePlans}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Last Test
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {dr.lastTestResult ? (
              <StatusBadge status={dr.lastTestResult} />
            ) : (
              '--'
            )}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatDate(dr.lastTestDate)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Next Scheduled Test
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatDate(dr.nextTestDate)}
          </p>
        </div>
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
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="text"
          placeholder="Search DR plans..."
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
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                RTO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                RPO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Owner
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plans.edges.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-gray-500"
                  colSpan={6}
                >
                  No DR plans found.{' '}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-primary-600 hover:underline"
                  >
                    Create your first DR plan
                  </button>
                  .
                </td>
              </tr>
            ) : (
              plans.edges.map((edge: any) => {
                const plan = edge.node
                return (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/grc/dr-plans/${plan.id}`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {plan.name}
                      </Link>
                      {plan.scope && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {plan.scope}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {plan.version || '--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatMinutes(plan.rtoMinutes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatMinutes(plan.rpoMinutes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {plan.owner?.displayName || '--'}
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
        totalCount={plans.totalCount}
        hasNextPage={plans.pageInfo.hasNextPage}
        hasPreviousPage={plans.pageInfo.hasPreviousPage}
        onNextPage={() => pagination.goToNextPage(plans.pageInfo.endCursor)}
        onPreviousPage={pagination.goToPreviousPage}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add DR Plan"
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
              Scope
            </label>
            <textarea
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Version
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="1.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                RTO (min)
              </label>
              <input
                type="number"
                value={form.rtoMinutes}
                onChange={(e) =>
                  setForm({ ...form, rtoMinutes: e.target.value })
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
                value={form.rpoMinutes}
                onChange={(e) =>
                  setForm({ ...form, rpoMinutes: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
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
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function DrPlanList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <DrPlanListContent />
    </Suspense>
  )
}
