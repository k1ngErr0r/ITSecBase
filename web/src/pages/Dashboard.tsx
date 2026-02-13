import { Suspense } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/common'

const DashboardQuery = graphql`
  query DashboardQuery {
    vulnOverview {
      totalOpen
      criticalCount
      highCount
      mediumCount
      lowCount
      mttrDays
    }
    riskPosture {
      countsByLevel {
        level
        count
      }
    }
    incidentStatus {
      openByImpact {
        impact
        count
      }
      slaBreaches
    }
    complianceSnapshot {
      implementedPct
      partiallyImplementedPct
      notImplementedPct
      notApplicablePct
    }
    drReadiness {
      nextTestDate
      lastTestDate
      lastTestResult
    }
    myTasks {
      assignedVulnCount
      assignedRiskCount
      assignedIncidentCount
      assignedActionCount
    }
    cveFeed(limit: 10) {
      id
      cveId
      score
      affectedProducts
      publishedDate
      link
    }
  }
`

function DashboardContent() {
  const data = useLazyLoadQuery<any>(DashboardQuery, {})

  const vulns = data.vulnOverview
  const risks = data.riskPosture
  const incidents = data.incidentStatus
  const compliance = data.complianceSnapshot
  const dr = data.drReadiness
  const tasks = data.myTasks
  const cveFeed = data.cveFeed

  const totalIncidents = incidents.openByImpact.reduce(
    (sum: number, i: any) => sum + i.count,
    0,
  )
  const totalRisks = risks.countsByLevel.reduce(
    (sum: number, r: any) => sum + r.count,
    0,
  )
  const totalTasks =
    tasks.assignedVulnCount +
    tasks.assignedRiskCount +
    tasks.assignedIncidentCount +
    tasks.assignedActionCount

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Vulnerabilities */}
        <Link
          to="/vulnerabilities"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            Vulnerabilities
          </h3>
          <p className="text-3xl font-bold text-gray-900">{vulns.totalOpen}</p>
          <p className="mt-1 text-sm text-gray-500">Open vulnerabilities</p>
          <div className="mt-3 flex gap-2">
            {vulns.criticalCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {vulns.criticalCount} critical
              </span>
            )}
            {vulns.highCount > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                {vulns.highCount} high
              </span>
            )}
          </div>
        </Link>

        {/* Risks */}
        <Link
          to="/grc/risks"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            Risk Posture
          </h3>
          <p className="text-3xl font-bold text-gray-900">{totalRisks}</p>
          <p className="mt-1 text-sm text-gray-500">Open risks</p>
          <div className="mt-3 flex gap-2">
            {risks.countsByLevel.map((r: any) => (
              <span
                key={r.level}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {r.count} {r.level}
              </span>
            ))}
          </div>
        </Link>

        {/* Incidents */}
        <Link
          to="/grc/incidents"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            Incidents
          </h3>
          <p className="text-3xl font-bold text-gray-900">{totalIncidents}</p>
          <p className="mt-1 text-sm text-gray-500">Open incidents</p>
          {incidents.slaBreaches > 0 && (
            <div className="mt-3">
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {incidents.slaBreaches} SLA breaches
              </span>
            </div>
          )}
        </Link>

        {/* My Tasks */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            My Tasks
          </h3>
          <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
          <p className="mt-1 text-sm text-gray-500">Assigned items</p>
          <div className="mt-3 space-y-1 text-xs text-gray-600">
            <p>{tasks.assignedVulnCount} vulnerabilities</p>
            <p>{tasks.assignedRiskCount} risks</p>
            <p>{tasks.assignedIncidentCount} incidents</p>
            <p>{tasks.assignedActionCount} actions</p>
          </div>
        </div>
      </div>

      {/* Compliance & DR Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance */}
        <Link
          to="/grc/iso-controls"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            ISO 27001 Compliance
          </h3>
          <div className="mb-2 flex h-4 overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-green-500"
              style={{ width: `${compliance.implementedPct}%` }}
            />
            <div
              className="bg-yellow-400"
              style={{ width: `${compliance.partiallyImplementedPct}%` }}
            />
            <div
              className="bg-red-400"
              style={{ width: `${compliance.notImplementedPct}%` }}
            />
            <div
              className="bg-gray-300"
              style={{ width: `${compliance.notApplicablePct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Implemented {compliance.implementedPct.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              Partial {compliance.partiallyImplementedPct.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              Not Impl {compliance.notImplementedPct.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
              N/A {compliance.notApplicablePct.toFixed(0)}%
            </span>
          </div>
        </Link>

        {/* DR Readiness */}
        <Link
          to="/grc/dr-plans"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            DR Readiness
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Last Test Result
              </dt>
              <dd className="mt-1">
                {dr.lastTestResult ? (
                  <StatusBadge status={dr.lastTestResult} />
                ) : (
                  <span className="text-sm text-gray-400">No tests</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Last Test Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(dr.lastTestDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Next Test Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(dr.nextTestDate)}
              </dd>
            </div>
          </dl>
        </Link>
      </div>

      {/* MTTR + CVE Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* MTTR */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            Mean Time to Remediate
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {vulns.mttrDays != null ? `${vulns.mttrDays.toFixed(1)}d` : '--'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Average days to close vulnerabilities
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>
              {vulns.mediumCount} medium, {vulns.lowCount} low remaining
            </p>
          </div>
        </div>

        {/* CVE Feed */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            Latest CVEs
          </h3>
          {cveFeed.length === 0 ? (
            <p className="text-sm text-gray-500">
              No CVE feed entries. Configure the CVE feed in settings.
            </p>
          ) : (
            <div className="space-y-3">
              {cveFeed.map((cve: any) => (
                <div
                  key={cve.id}
                  className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {cve.cveId}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {cve.affectedProducts.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {cve.score != null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          cve.score >= 9.0
                            ? 'bg-red-100 text-red-800'
                            : cve.score >= 7.0
                              ? 'bg-orange-100 text-orange-800'
                              : cve.score >= 4.0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {cve.score.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(cve.publishedDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
                <div className="h-8 w-16 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
