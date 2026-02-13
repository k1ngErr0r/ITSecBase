import { Suspense } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/common'
import { useFilters } from '../../hooks/useFilters'

const IsoControlListQuery = graphql`
  query IsoControlListQuery($filter: OrgIsoControlFilter) {
    orgIsoControls(first: 200, filter: $filter) {
      edges {
        node {
          id
          control {
            id
            controlId
            name
            theme
          }
          applicability
          implementationStatus
          responsibleOwner {
            id
            displayName
          }
        }
      }
      totalCount
    }
    complianceSnapshot {
      implementedPct
      partiallyImplementedPct
      notImplementedPct
      notApplicablePct
    }
  }
`

const themeOrder = ['organisational', 'people', 'physical', 'technological']
const themeLabel: Record<string, string> = {
  organisational: 'Organisational',
  people: 'People',
  physical: 'Physical',
  technological: 'Technological',
}

function IsoControlListContent() {
  const { filters, updateFilter } = useFilters({
    theme: '',
    implementationStatus: '',
    search: '',
  })

  const filter: Record<string, any> = {}
  if (filters.theme) filter.theme = filters.theme
  if (filters.implementationStatus)
    filter.implementationStatus = filters.implementationStatus
  if (filters.search) filter.search = filters.search

  const data = useLazyLoadQuery<any>(IsoControlListQuery, {
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  })

  const controls = data.orgIsoControls
  const snap = data.complianceSnapshot

  // Group by theme
  const grouped: Record<string, any[]> = {}
  for (const theme of themeOrder) {
    grouped[theme] = []
  }
  for (const edge of controls.edges) {
    const theme = edge.node.control.theme
    if (grouped[theme]) {
      grouped[theme].push(edge.node)
    }
  }

  // Count by status
  const statusCounts: Record<string, number> = {
    implemented: 0,
    partially_implemented: 0,
    not_implemented: 0,
    not_applicable: 0,
  }
  for (const edge of controls.edges) {
    const s = edge.node.implementationStatus
    if (statusCounts[s] !== undefined) statusCounts[s]++
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          ISO 27001:2022 Controls
        </h1>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Export SOA
        </button>
      </div>

      {/* Compliance summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Implemented
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {statusCounts.implemented}
          </p>
          <p className="text-xs text-gray-500">
            {snap.implementedPct.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Partially Implemented
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {statusCounts.partially_implemented}
          </p>
          <p className="text-xs text-gray-500">
            {snap.partiallyImplementedPct.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Not Implemented
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {statusCounts.not_implemented}
          </p>
          <p className="text-xs text-gray-500">
            {snap.notImplementedPct.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Not Applicable
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-500">
            {statusCounts.not_applicable}
          </p>
          <p className="text-xs text-gray-500">
            {snap.notApplicablePct.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.theme}
          onChange={(e) => updateFilter('theme', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Themes</option>
          <option value="organisational">Organisational</option>
          <option value="people">People</option>
          <option value="physical">Physical</option>
          <option value="technological">Technological</option>
        </select>
        <select
          value={filters.implementationStatus}
          onChange={(e) =>
            updateFilter('implementationStatus', e.target.value)
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="implemented">Implemented</option>
          <option value="partially_implemented">Partially Implemented</option>
          <option value="not_implemented">Not Implemented</option>
          <option value="not_applicable">Not Applicable</option>
        </select>
        <input
          type="text"
          placeholder="Search controls..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Controls grouped by theme */}
      {themeOrder
        .filter(
          (theme) => !filters.theme || filters.theme === theme,
        )
        .map((theme) => {
          const items = grouped[theme]
          if (items.length === 0) return null
          return (
            <div key={theme} className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {themeLabel[theme]} Controls ({items.length})
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Control ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Applicability
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Implementation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Owner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((oc: any) => (
                      <tr key={oc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">
                          <Link
                            to={`/grc/iso-controls/${oc.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {oc.control.controlId}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {oc.control.name}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={oc.applicability} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={oc.implementationStatus} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {oc.responsibleOwner?.displayName || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

      {controls.edges.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No ISO controls found matching your filters.
          </p>
        </div>
      )}
    </div>
  )
}

export default function IsoControlList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <IsoControlListContent />
    </Suspense>
  )
}
