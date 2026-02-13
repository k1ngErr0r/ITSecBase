interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'severity' | 'impact'
}

const statusColors: Record<string, string> = {
  // General
  active: 'bg-green-100 text-green-800',
  disabled: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-600',

  // Vulnerability statuses
  new: 'bg-blue-100 text-blue-800',
  triaged: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  risk_accepted: 'bg-orange-100 text-orange-800',
  mitigated: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',

  // Risk statuses
  identified: 'bg-blue-100 text-blue-800',
  assessed: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-orange-100 text-orange-800',

  // Incident statuses
  triage: 'bg-yellow-100 text-yellow-800',
  containment: 'bg-orange-100 text-orange-800',
  eradication: 'bg-red-100 text-red-800',
  recovery: 'bg-blue-100 text-blue-800',
  lessons_learned: 'bg-purple-100 text-purple-800',

  // Asset statuses
  in_use: 'bg-green-100 text-green-800',
  decommissioning: 'bg-yellow-100 text-yellow-800',
  decommissioned: 'bg-gray-100 text-gray-600',

  // DR test results
  pass: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  fail: 'bg-red-100 text-red-800',

  // ISO implementation
  implemented: 'bg-green-100 text-green-800',
  partially_implemented: 'bg-yellow-100 text-yellow-800',
  not_implemented: 'bg-red-100 text-red-800',
  not_applicable: 'bg-gray-100 text-gray-600',

  // Treatment/Action
  open: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
  info: 'bg-gray-100 text-gray-800',
}

const impactColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

export default function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  let colorClass: string

  switch (variant) {
    case 'severity':
      colorClass = severityColors[status] || 'bg-gray-100 text-gray-800'
      break
    case 'impact':
      colorClass = impactColors[status] || 'bg-gray-100 text-gray-800'
      break
    default:
      colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
