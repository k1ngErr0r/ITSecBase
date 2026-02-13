import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'

import DataTable from '../../components/common/DataTable'
import FilterBar from '../../components/common/FilterBar'
import Pagination from '../../components/common/Pagination'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import ImportModal from '../../components/common/ImportModal'
import { usePagination } from '../../hooks/usePagination'
import { useFilters } from '../../hooks/useFilters'
import { generateCsv, downloadFile } from '../../utils/csv'

const AssetListQueryDef = graphql`
  query AssetListQuery($first: Int, $after: String, $filter: AssetFilter) {
    assets(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          assetType
          environment
          criticality
          status
          businessOwner {
            id
            displayName
          }
          tags
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
  }
`

const CreateAssetMutationDef = graphql`
  mutation AssetListCreateAssetMutation($input: CreateAssetInput!) {
    createAsset(input: $input) {
      id
      name
      assetType
      make
      model
      version
      environment
      criticality
      dataClassification
      ipAddresses
      hostnames
      fqdn
      url
      locationSite
      locationDetail
      tags
      status
    }
  }
`

interface AssetNode {
  id: string
  name: string
  assetType: string
  environment: string
  criticality: number
  status: string
  businessOwner: { id: string; displayName: string } | null
  tags: string[]
}

interface CreateAssetForm {
  name: string
  assetType: string
  make: string
  model: string
  version: string
  environment: string
  criticality: number
  dataClassification: string
  ipAddresses: string
  hostnames: string
  fqdn: string
  url: string
  locationSite: string
  locationDetail: string
  tags: string
}

const initialForm: CreateAssetForm = {
  name: '',
  assetType: 'server',
  make: '',
  model: '',
  version: '',
  environment: 'production',
  criticality: 3,
  dataClassification: '',
  ipAddresses: '',
  hostnames: '',
  fqdn: '',
  url: '',
  locationSite: '',
  locationDetail: '',
  tags: '',
}

const assetTypeOptions = [
  { value: 'server', label: 'Server' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'application', label: 'Application' },
  { value: 'database', label: 'Database' },
  { value: 'network_device', label: 'Network Device' },
  { value: 'saas', label: 'SaaS' },
]

const environmentOptions = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
]

const statusOptions = [
  { value: 'in_use', label: 'In Use' },
  { value: 'decommissioning', label: 'Decommissioning' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

const filterFields = [
  {
    key: 'assetType',
    label: 'All Types',
    type: 'select' as const,
    options: assetTypeOptions,
  },
  {
    key: 'environment',
    label: 'All Environments',
    type: 'select' as const,
    options: environmentOptions,
  },
  {
    key: 'status',
    label: 'All Statuses',
    type: 'select' as const,
    options: statusOptions,
  },
  {
    key: 'search',
    label: 'Search',
    type: 'search' as const,
    placeholder: 'Search assets...',
  },
]

const criticalityLabel = (val: number): string => {
  switch (val) {
    case 1:
      return '1 - Low'
    case 2:
      return '2 - Medium-Low'
    case 3:
      return '3 - Medium'
    case 4:
      return '4 - High'
    case 5:
      return '5 - Critical'
    default:
      return String(val)
  }
}

const formatAssetType = (type: string): string =>
  type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

function AssetListContent() {
  const { filters, updateFilter, clearFilters } = useFilters({
    assetType: '',
    environment: '',
    status: '',
    search: '',
  })

  const { currentPage, pageSize, after, goToNextPage, goToPreviousPage, reset } =
    usePagination({ pageSize: 25 })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingRows, setImportingRows] = useState(false)
  const [form, setForm] = useState<CreateAssetForm>({ ...initialForm })
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Build the filter object, omitting empty strings
  const queryFilter: Record<string, string> = {}
  if (filters.assetType) queryFilter.assetType = filters.assetType
  if (filters.environment) queryFilter.environment = filters.environment
  if (filters.status) queryFilter.status = filters.status
  if (filters.search) queryFilter.search = filters.search

  const data = useLazyLoadQuery<any>(AssetListQueryDef, {
    first: pageSize,
    after,
    filter: Object.keys(queryFilter).length > 0 ? queryFilter : undefined,
  })

  const [commitCreateAsset, isCreating] = useMutation(CreateAssetMutationDef)

  const assets: AssetNode[] =
    data.assets?.edges?.map((edge: { node: AssetNode }) => edge.node) ?? []
  const pageInfo = data.assets?.pageInfo ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    endCursor: null,
    startCursor: null,
  }
  const totalCount: number = data.assets?.totalCount ?? 0

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item: AssetNode) => (
        <Link
          to={`/assets/${item.id}`}
          className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
        >
          {item.name}
        </Link>
      ),
    },
    {
      key: 'assetType',
      header: 'Type',
      sortable: true,
      render: (item: AssetNode) => formatAssetType(item.assetType),
    },
    {
      key: 'environment',
      header: 'Environment',
      sortable: true,
      render: (item: AssetNode) => (
        <span className="capitalize">{item.environment}</span>
      ),
    },
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      render: (item: AssetNode) => criticalityLabel(item.criticality),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: AssetNode) => <StatusBadge status={item.status} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (item: AssetNode) =>
        item.businessOwner?.displayName ?? (
          <span className="text-gray-400">Unassigned</span>
        ),
    },
  ]

  const handleFilterChange = (key: string, value: string) => {
    updateFilter(key as keyof typeof filters, value)
    reset()
  }

  const handleClearFilters = () => {
    clearFilters()
    reset()
  }

  const updateForm = (key: keyof CreateAssetForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreateSubmit = () => {
    const errors: string[] = []
    if (!form.name.trim()) errors.push('Name is required.')
    if (!form.assetType) errors.push('Asset type is required.')

    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors([])

    const input: Record<string, unknown> = {
      name: form.name.trim(),
      assetType: form.assetType,
      environment: form.environment || undefined,
      criticality: form.criticality,
    }

    if (form.make.trim()) input.make = form.make.trim()
    if (form.model.trim()) input.model = form.model.trim()
    if (form.version.trim()) input.version = form.version.trim()
    if (form.dataClassification.trim())
      input.dataClassification = form.dataClassification.trim()
    if (form.ipAddresses.trim())
      input.ipAddresses = form.ipAddresses
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    if (form.hostnames.trim())
      input.hostnames = form.hostnames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    if (form.fqdn.trim()) input.fqdn = form.fqdn.trim()
    if (form.url.trim()) input.url = form.url.trim()
    if (form.locationSite.trim()) input.locationSite = form.locationSite.trim()
    if (form.locationDetail.trim())
      input.locationDetail = form.locationDetail.trim()
    if (form.tags.trim())
      input.tags = form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

    commitCreateAsset({
      variables: { input },
      onCompleted: () => {
        setShowCreateModal(false)
        setForm({ ...initialForm })
      },
      onError: (error: Error) => {
        setFormErrors([error.message || 'Failed to create asset.'])
      },
      updater: (store) => {
        store.invalidateStore()
      },
    })
  }

  const handleImport = () => {
    setShowImportModal(true)
  }

  const handleImportRows = (rows: Record<string, string>[]) => {
    setImportingRows(true)
    let completed = 0
    const total = rows.length

    for (const row of rows) {
      const input: Record<string, unknown> = {
        name: row.name || 'Unnamed Asset',
        assetType: row.assetType || 'server',
      }
      if (row.make) input.make = row.make
      if (row.model) input.model = row.model
      if (row.version) input.version = row.version
      if (row.environment) input.environment = row.environment
      if (row.criticality) input.criticality = parseInt(row.criticality) || 3
      if (row.dataClassification) input.dataClassification = row.dataClassification
      if (row.ipAddresses) input.ipAddresses = row.ipAddresses.split(',').map((s) => s.trim()).filter(Boolean)
      if (row.hostnames) input.hostnames = row.hostnames.split(',').map((s) => s.trim()).filter(Boolean)
      if (row.fqdn) input.fqdn = row.fqdn
      if (row.url) input.url = row.url
      if (row.locationSite) input.locationSite = row.locationSite
      if (row.locationDetail) input.locationDetail = row.locationDetail
      if (row.tags) input.tags = row.tags.split(',').map((s) => s.trim()).filter(Boolean)

      commitCreateAsset({
        variables: { input },
        onCompleted: () => {
          completed++
          if (completed === total) {
            setImportingRows(false)
            setShowImportModal(false)
          }
        },
        onError: () => {
          completed++
          if (completed === total) {
            setImportingRows(false)
            setShowImportModal(false)
          }
        },
        updater: (store) => {
          if (completed === total) store.invalidateStore()
        },
      })
    }
  }

  const assetImportFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'assetType', label: 'Asset Type', required: true },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'version', label: 'Version' },
    { key: 'environment', label: 'Environment' },
    { key: 'criticality', label: 'Criticality' },
    { key: 'dataClassification', label: 'Data Classification' },
    { key: 'ipAddresses', label: 'IP Addresses' },
    { key: 'hostnames', label: 'Hostnames' },
    { key: 'fqdn', label: 'FQDN' },
    { key: 'url', label: 'URL' },
    { key: 'locationSite', label: 'Location Site' },
    { key: 'locationDetail', label: 'Location Detail' },
    { key: 'tags', label: 'Tags' },
  ]

  const handleExport = () => {
    const headers = [
      'name', 'assetType', 'environment', 'criticality', 'status', 'owner', 'tags',
    ]
    const exportRows = assets.map((a) => ({
      name: a.name,
      assetType: a.assetType,
      environment: a.environment,
      criticality: String(a.criticality),
      status: a.status,
      owner: a.businessOwner?.displayName || '',
      tags: (a.tags || []).join(', '),
    }))
    const csv = generateCsv(headers, exportRows)
    downloadFile(csv, `assets-export-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Add Asset
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={assets}
        keyExtractor={(item) => item.id}
        emptyMessage="No assets found."
        emptyAction={{ label: 'Add your first asset', href: '#' }}
      />

      {/* Pagination */}
      <Pagination
        hasNextPage={pageInfo.hasNextPage}
        hasPreviousPage={pageInfo.hasPreviousPage}
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onNextPage={() => {
          if (pageInfo.endCursor) goToNextPage(pageInfo.endCursor)
        }}
        onPreviousPage={goToPreviousPage}
      />

      {/* Create Asset Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setForm({ ...initialForm })
          setFormErrors([])
        }}
        title="Add Asset"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowCreateModal(false)
                setForm({ ...initialForm })
                setFormErrors([])
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSubmit}
              disabled={isCreating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Asset'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3">
              {formErrors.map((err, i) => (
                <p key={i} className="text-sm text-red-700">
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g. prod-web-server-01"
            />
          </div>

          {/* Type and Environment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.assetType}
                onChange={(e) => updateForm('assetType', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {assetTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Environment
              </label>
              <select
                value={form.environment}
                onChange={(e) => updateForm('environment', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {environmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Make, Model, Version */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Make
              </label>
              <input
                type="text"
                value={form.make}
                onChange={(e) => updateForm('make', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. Dell"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => updateForm('model', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. PowerEdge R740"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Version
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => updateForm('version', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. 2.1.0"
              />
            </div>
          </div>

          {/* Criticality and Data Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Criticality
              </label>
              <select
                value={form.criticality}
                onChange={(e) =>
                  updateForm('criticality', parseInt(e.target.value, 10))
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={1}>1 - Low</option>
                <option value={2}>2 - Medium-Low</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - High</option>
                <option value={5}>5 - Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data Classification
              </label>
              <select
                value={form.dataClassification}
                onChange={(e) =>
                  updateForm('dataClassification', e.target.value)
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select...</option>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>

          {/* Network: IP Addresses and Hostnames */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                IP Addresses
              </label>
              <input
                type="text"
                value={form.ipAddresses}
                onChange={(e) => updateForm('ipAddresses', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Comma-separated"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Hostnames
              </label>
              <input
                type="text"
                value={form.hostnames}
                onChange={(e) => updateForm('hostnames', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Comma-separated"
              />
            </div>
          </div>

          {/* FQDN and URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                FQDN
              </label>
              <input
                type="text"
                value={form.fqdn}
                onChange={(e) => updateForm('fqdn', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. server01.corp.example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                URL
              </label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => updateForm('url', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. https://app.example.com"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Location Site
              </label>
              <input
                type="text"
                value={form.locationSite}
                onChange={(e) => updateForm('locationSite', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. HQ Data Center"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Location Detail
              </label>
              <input
                type="text"
                value={form.locationDetail}
                onChange={(e) => updateForm('locationDetail', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. Rack A3, Unit 12"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => updateForm('tags', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Comma-separated, e.g. pci, dmz, linux"
            />
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Assets"
        fields={assetImportFields}
        onImport={handleImportRows}
        importing={importingRows}
      />
    </div>
  )
}

export default function AssetList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <AssetListContent />
    </Suspense>
  )
}
