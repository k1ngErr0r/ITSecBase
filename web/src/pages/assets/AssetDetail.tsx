import { useParams } from 'react-router-dom'

export default function AssetDetail() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Asset Detail</h1>
      <p className="text-sm text-gray-500">Asset ID: {id}</p>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          Asset details will load from GraphQL once resolvers are implemented.
        </p>
      </div>
    </div>
  )
}
