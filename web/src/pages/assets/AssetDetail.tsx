import { Suspense, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'

import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import CommentThread from '../../components/common/CommentThread'
import FileUpload from '../../components/common/FileUpload'

const AssetDetailQueryDef = graphql`
  query AssetDetailQuery($id: ID!) {
    asset(id: $id) {
      id
      name
      assetType
      make
      model
      version
      businessOwner {
        id
        displayName
        email
      }
      technicalOwner {
        id
        displayName
        email
      }
      ipAddresses
      hostnames
      fqdn
      url
      locationSite
      locationDetail
      environment
      criticality
      dataClassification
      tags
      status
      decommissionDate
      createdAt
      updatedAt
      vulnerabilities(first: 10) {
        edges {
          node {
            id
            title
            severity
            status
            cvssScore
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
      dependencies {
        id
        name
        assetType
      }
    }
  }
`

const UpdateAssetMutationDef = graphql`
  mutation AssetDetailUpdateAssetMutation($id: ID!, $input: UpdateAssetInput!) {
    updateAsset(id: $id, input: $input) {
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

const DeleteAssetMutationDef = graphql`
  mutation AssetDetailDeleteAssetMutation($id: ID!) {
    deleteAsset(id: $id)
  }
`

const AddCommentMutationDef = graphql`
  mutation AssetDetailAddCommentMutation($input: AddCommentInput!) {
    addComment(input: $input) {
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
`

const UpdateCommentMutationDef = graphql`
  mutation AssetDetailUpdateCommentMutation($id: ID!, $body: String!) {
    updateComment(id: $id, body: $body) {
      id
      body
      updatedAt
    }
  }
`

const DeleteCommentMutationDef = graphql`
  mutation AssetDetailDeleteCommentMutation($id: ID!) {
    deleteComment(id: $id)
  }
`

type TabKey = 'overview' | 'vulnerabilities' | 'comments' | 'evidence'

interface EditAssetForm {
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
  status: string
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

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'vulnerabilities', label: 'Vulnerabilities' },
  { key: 'comments', label: 'Comments' },
  { key: 'evidence', label: 'Evidence' },
]

const formatAssetType = (type: string): string =>
  type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

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

const formatDate = (iso: string): string => {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (iso: string): string => {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AssetDetailContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editForm, setEditForm] = useState<EditAssetForm | null>(null)
  const [formErrors, setFormErrors] = useState<string[]>([])

  const data = useLazyLoadQuery<any>(AssetDetailQueryDef, { id: id! })
  const asset = data.asset

  const [commitUpdate, isUpdating] = useMutation(UpdateAssetMutationDef)
  const [commitDelete, isDeleting] = useMutation(DeleteAssetMutationDef)
  const [commitAddComment] = useMutation(AddCommentMutationDef)
  const [commitUpdateComment] = useMutation(UpdateCommentMutationDef)
  const [commitDeleteComment] = useMutation(DeleteCommentMutationDef)

  if (!asset) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Asset not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          The asset you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/assets"
          className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          Back to Assets
        </Link>
      </div>
    )
  }

  // Extract nested data
  const vulnerabilities =
    asset.vulnerabilities?.edges?.map(
      (e: { node: Record<string, unknown> }) => e.node,
    ) ?? []
  const vulnTotalCount: number = asset.vulnerabilities?.totalCount ?? 0

  const comments =
    asset.comments?.edges?.map(
      (e: {
        node: {
          id: string
          body: string
          author: { id: string; displayName: string }
          createdAt: string
          updatedAt: string
        }
      }) => e.node,
    ) ?? []
  const commentTotalCount: number = asset.comments?.totalCount ?? 0

  const evidenceFiles =
    asset.evidence?.edges?.map(
      (e: { node: Record<string, unknown> }) => e.node,
    ) ?? []
  const evidenceTotalCount: number = asset.evidence?.totalCount ?? 0

  const dependencies: { id: string; name: string; assetType: string }[] =
    asset.dependencies ?? []

  // Edit handling
  const openEditModal = () => {
    setEditForm({
      name: asset.name ?? '',
      assetType: asset.assetType ?? 'server',
      make: asset.make ?? '',
      model: asset.model ?? '',
      version: asset.version ?? '',
      environment: asset.environment ?? 'production',
      criticality: asset.criticality ?? 3,
      dataClassification: asset.dataClassification ?? '',
      ipAddresses: (asset.ipAddresses ?? []).join(', '),
      hostnames: (asset.hostnames ?? []).join(', '),
      fqdn: asset.fqdn ?? '',
      url: asset.url ?? '',
      locationSite: asset.locationSite ?? '',
      locationDetail: asset.locationDetail ?? '',
      tags: (asset.tags ?? []).join(', '),
      status: asset.status ?? 'in_use',
    })
    setFormErrors([])
    setShowEditModal(true)
  }

  const updateEditForm = (key: keyof EditAssetForm, value: string | number) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleEditSubmit = () => {
    if (!editForm) return

    const errors: string[] = []
    if (!editForm.name.trim()) errors.push('Name is required.')

    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors([])

    const input: Record<string, unknown> = {
      name: editForm.name.trim(),
      assetType: editForm.assetType,
      environment: editForm.environment,
      criticality: editForm.criticality,
      status: editForm.status,
    }

    if (editForm.make.trim()) input.make = editForm.make.trim()
    if (editForm.model.trim()) input.model = editForm.model.trim()
    if (editForm.version.trim()) input.version = editForm.version.trim()
    if (editForm.dataClassification.trim())
      input.dataClassification = editForm.dataClassification.trim()
    if (editForm.ipAddresses.trim())
      input.ipAddresses = editForm.ipAddresses
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    if (editForm.hostnames.trim())
      input.hostnames = editForm.hostnames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    if (editForm.fqdn.trim()) input.fqdn = editForm.fqdn.trim()
    if (editForm.url.trim()) input.url = editForm.url.trim()
    if (editForm.locationSite.trim())
      input.locationSite = editForm.locationSite.trim()
    if (editForm.locationDetail.trim())
      input.locationDetail = editForm.locationDetail.trim()
    if (editForm.tags.trim())
      input.tags = editForm.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

    commitUpdate({
      variables: { id: asset.id, input },
      onCompleted: () => {
        setShowEditModal(false)
        setEditForm(null)
      },
      onError: (error: Error) => {
        setFormErrors([error.message || 'Failed to update asset.'])
      },
    })
  }

  // Delete handling
  const handleDelete = () => {
    commitDelete({
      variables: { id: asset.id },
      onCompleted: () => {
        navigate('/assets')
      },
      onError: (error: Error) => {
        setShowDeleteConfirm(false)
        alert(error.message || 'Failed to delete asset.')
      },
      updater: (store) => {
        store.invalidateStore()
      },
    })
  }

  // Comment handlers
  const handleAddComment = (body: string) => {
    commitAddComment({
      variables: {
        input: {
          targetType: 'Asset',
          targetId: asset.id,
          body,
        },
      },
      updater: (store) => {
        store.invalidateStore()
      },
    })
  }

  const handleUpdateComment = (commentId: string, body: string) => {
    commitUpdateComment({
      variables: { id: commentId, body },
    })
  }

  const handleDeleteComment = (commentId: string) => {
    commitDeleteComment({
      variables: { id: commentId },
      updater: (store) => {
        store.invalidateStore()
      },
    })
  }

  // Evidence upload handler (placeholder)
  const handleEvidenceUpload = (_file: File) => {
    // Placeholder: actual upload mutation will be implemented once the
    // GraphQL upload scalar and resolver are in place
    console.log('Evidence upload - not yet implemented')
  }

  // Map comments to the format expected by CommentThread
  const threadComments = comments.map(
    (c: {
      id: string
      body: string
      author: { displayName: string }
      createdAt: string
    }) => ({
      id: c.id,
      authorName: c.author?.displayName ?? 'Unknown',
      body: c.body,
      createdAt: c.createdAt,
    }),
  )

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Assets
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatAssetType(asset.assetType)}
            {asset.environment && (
              <span className="ml-2 capitalize">
                / {asset.environment}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openEditModal}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
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
              {tab.key === 'vulnerabilities' && vulnTotalCount > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {vulnTotalCount}
                </span>
              )}
              {tab.key === 'comments' && commentTotalCount > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {commentTotalCount}
                </span>
              )}
              {tab.key === 'evidence' && evidenceTotalCount > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {evidenceTotalCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Asset Properties */}
          <div className="space-y-6 lg:col-span-2">
            {/* Identity */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Asset Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{asset.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatAssetType(asset.assetType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Make</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.make || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Model</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.model || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.version || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={asset.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Environment
                  </dt>
                  <dd className="mt-1 text-sm capitalize text-gray-900">
                    {asset.environment || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Criticality
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {criticalityLabel(asset.criticality)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Data Classification
                  </dt>
                  <dd className="mt-1 text-sm capitalize text-gray-900">
                    {asset.dataClassification || '--'}
                  </dd>
                </div>
                {asset.decommissionDate && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">
                      Decommission Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(asset.decommissionDate)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Network Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Network Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    IP Addresses
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.ipAddresses?.length > 0
                      ? asset.ipAddresses.join(', ')
                      : '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Hostnames
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.hostnames?.length > 0
                      ? asset.hostnames.join(', ')
                      : '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">FQDN</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.fqdn || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">URL</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.url ? (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {asset.url}
                      </a>
                    ) : (
                      '--'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Location */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Location
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Site</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.locationSite || '--'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Detail</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {asset.locationDetail || '--'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags */}
            {asset.tags?.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Dependencies
                </h3>
                <ul className="divide-y divide-gray-100">
                  {dependencies.map((dep) => (
                    <li key={dep.id} className="flex items-center gap-3 py-2">
                      <Link
                        to={`/assets/${dep.id}`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {dep.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {formatAssetType(dep.assetType)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Metadata
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime(asset.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime(asset.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Ownership
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Business Owner
                  </dt>
                  <dd className="mt-1">
                    {asset.businessOwner ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {asset.businessOwner.displayName}
                        </p>
                        {asset.businessOwner.email && (
                          <p className="text-xs text-gray-500">
                            {asset.businessOwner.email}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">
                    Technical Owner
                  </dt>
                  <dd className="mt-1">
                    {asset.technicalOwner ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {asset.technicalOwner.displayName}
                        </p>
                        {asset.technicalOwner.email && (
                          <p className="text-xs text-gray-500">
                            {asset.technicalOwner.email}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Stats */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Summary
              </h3>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-medium text-gray-500">
                    Vulnerabilities
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {vulnTotalCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-medium text-gray-500">
                    Dependencies
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {dependencies.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-medium text-gray-500">
                    Evidence Files
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {evidenceTotalCount}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vulnerabilities' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Associated Vulnerabilities ({vulnTotalCount})
              </h3>
            </div>
          </div>
          {vulnerabilities.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No vulnerabilities linked to this asset.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    CVSS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vulnerabilities.map(
                  (vuln: {
                    id: string
                    title: string
                    severity: string
                    status: string
                    cvssScore: number | null
                  }) => (
                    <tr key={vuln.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          to={`/vulnerabilities/${vuln.id}`}
                          className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {vuln.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <StatusBadge
                          status={vuln.severity}
                          variant="severity"
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {vuln.cvssScore != null ? vuln.cvssScore.toFixed(1) : '--'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <StatusBadge status={vuln.status} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
          {vulnTotalCount > 10 && (
            <div className="border-t border-gray-200 px-6 py-3">
              <Link
                to={`/vulnerabilities?assetId=${asset.id}`}
                className="text-sm font-medium text-primary-600 hover:text-primary-800"
              >
                View all {vulnTotalCount} vulnerabilities
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Comments ({commentTotalCount})
          </h3>
          <CommentThread
            comments={threadComments}
            onAdd={handleAddComment}
            onUpdate={handleUpdateComment}
            onDelete={handleDeleteComment}
          />
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Upload Evidence
            </h3>
            <FileUpload
              onUpload={handleEvidenceUpload}
              maxSizeMB={25}
              label="Upload evidence file"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Evidence Files ({evidenceTotalCount})
              </h3>
            </div>
            {evidenceFiles.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No evidence files uploaded yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {evidenceFiles.map(
                  (file: {
                    id: string
                    fileName: string
                    fileSize: number
                    contentType: string
                    uploadedBy: { id: string; displayName: string } | null
                    createdAt: string
                  }) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.fileSize)} &middot;{' '}
                            {file.contentType}
                            {file.uploadedBy && (
                              <>
                                {' '}
                                &middot; Uploaded by{' '}
                                {file.uploadedBy.displayName}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(file.createdAt)}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Asset"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Asset'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{asset.name}</span>?
          This action cannot be undone and will remove all associated data
          including comments and evidence files.
        </p>
      </Modal>

      {/* Edit Asset Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditForm(null)
          setFormErrors([])
        }}
        title="Edit Asset"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowEditModal(false)
                setEditForm(null)
                setFormErrors([])
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={isUpdating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editForm && (
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
                value={editForm.name}
                onChange={(e) => updateEditForm('name', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Type, Environment, Status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Asset Type
                </label>
                <select
                  value={editForm.assetType}
                  onChange={(e) => updateEditForm('assetType', e.target.value)}
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
                  value={editForm.environment}
                  onChange={(e) =>
                    updateEditForm('environment', e.target.value)
                  }
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {environmentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => updateEditForm('status', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {statusOptions.map((opt) => (
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
                  value={editForm.make}
                  onChange={(e) => updateEditForm('make', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Model
                </label>
                <input
                  type="text"
                  value={editForm.model}
                  onChange={(e) => updateEditForm('model', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Version
                </label>
                <input
                  type="text"
                  value={editForm.version}
                  onChange={(e) => updateEditForm('version', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  value={editForm.criticality}
                  onChange={(e) =>
                    updateEditForm(
                      'criticality',
                      parseInt(e.target.value, 10),
                    )
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
                  value={editForm.dataClassification}
                  onChange={(e) =>
                    updateEditForm('dataClassification', e.target.value)
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
                  value={editForm.ipAddresses}
                  onChange={(e) =>
                    updateEditForm('ipAddresses', e.target.value)
                  }
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
                  value={editForm.hostnames}
                  onChange={(e) => updateEditForm('hostnames', e.target.value)}
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
                  value={editForm.fqdn}
                  onChange={(e) => updateEditForm('fqdn', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  URL
                </label>
                <input
                  type="text"
                  value={editForm.url}
                  onChange={(e) => updateEditForm('url', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  value={editForm.locationSite}
                  onChange={(e) =>
                    updateEditForm('locationSite', e.target.value)
                  }
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location Detail
                </label>
                <input
                  type="text"
                  value={editForm.locationDetail}
                  onChange={(e) =>
                    updateEditForm('locationDetail', e.target.value)
                  }
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                value={editForm.tags}
                onChange={(e) => updateEditForm('tags', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Comma-separated"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AssetDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      }
    >
      <AssetDetailContent />
    </Suspense>
  )
}
