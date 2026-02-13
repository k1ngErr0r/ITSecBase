interface HeatmapCell {
  likelihood: number
  impact: number
  count: number
}

interface HeatmapGridProps {
  data: HeatmapCell[]
  likelihoodLabels?: string[]
  impactLabels?: string[]
  onCellClick?: (likelihood: number, impact: number) => void
}

const defaultLikelihood = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare']
const defaultImpact = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe']

function getCellColor(score: number): string {
  if (score >= 15) return 'bg-red-200 hover:bg-red-300 text-red-900'
  if (score >= 10) return 'bg-orange-200 hover:bg-orange-300 text-orange-900'
  if (score >= 5) return 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
  return 'bg-green-200 hover:bg-green-300 text-green-900'
}

export default function HeatmapGrid({
  data,
  likelihoodLabels = defaultLikelihood,
  impactLabels = defaultImpact,
  onCellClick,
}: HeatmapGridProps) {
  const getCount = (likelihood: number, impact: number): number => {
    const cell = data.find((c) => c.likelihood === likelihood && c.impact === impact)
    return cell?.count || 0
  }

  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${impactLabels.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {impactLabels.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-gray-500 truncate px-1">
            {label}
          </div>
        ))}

        {/* Data rows (high likelihood at top) */}
        {likelihoodLabels.map((label, li) => {
          const likelihood = likelihoodLabels.length - li // 5,4,3,2,1

          return (
            <>
              <div key={`label-${label}`} className="flex items-center text-xs font-medium text-gray-500 pr-2">
                {label}
              </div>
              {impactLabels.map((_, ii) => {
                const impact = ii + 1
                const score = likelihood * impact
                const count = getCount(likelihood, impact)

                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    className={`flex h-10 items-center justify-center rounded text-xs font-semibold cursor-pointer transition-colors ${getCellColor(score)}`}
                    onClick={() => onCellClick?.(likelihood, impact)}
                    title={`Likelihood: ${likelihood}, Impact: ${impact}, Score: ${score}`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                )
              })}
            </>
          )
        })}
      </div>

      {/* Axis labels */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Likelihood ↑</span>
        <span>Impact →</span>
      </div>
    </div>
  )
}
