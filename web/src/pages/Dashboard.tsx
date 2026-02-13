export default function Dashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Vulnerability Overview Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            Vulnerabilities
          </h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Open vulnerabilities</p>
        </div>

        {/* Risk Posture Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            Risk Posture
          </h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Open risks</p>
        </div>

        {/* Incident Status Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            Incidents
          </h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Open incidents</p>
        </div>

        {/* Compliance Snapshot Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            ISO 27001 Compliance
          </h3>
          <p className="text-3xl font-bold text-gray-900">--%</p>
          <p className="mt-1 text-sm text-gray-500">Controls implemented</p>
        </div>

        {/* DR Readiness Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            DR Readiness
          </h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Next test date</p>
        </div>

        {/* My Tasks Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
            My Tasks
          </h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Assigned items</p>
        </div>
      </div>

      {/* News Feed Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Security News & CVE Feed
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            CVE feed and security news will appear here once configured.
          </p>
        </div>
      </div>
    </div>
  )
}
