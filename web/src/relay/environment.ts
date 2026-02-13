import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime'

const fetchFn: FetchFunction = async (request, variables) => {
  const token = localStorage.getItem('secbase_access_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  })

  // Handle token expiration
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('secbase_refresh_token')
    if (refreshToken) {
      const refreshResponse = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation RefreshToken($token: String!) {
            refreshToken(token: $token) {
              accessToken
              refreshToken
            }
          }`,
          variables: { token: refreshToken },
        }),
      })

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        const newTokens = refreshData.data?.refreshToken
        if (newTokens) {
          localStorage.setItem('secbase_access_token', newTokens.accessToken)
          localStorage.setItem('secbase_refresh_token', newTokens.refreshToken)

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${newTokens.accessToken}`
          const retryResponse = await fetch('/graphql', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: request.text,
              variables,
            }),
          })
          return await retryResponse.json()
        }
      }

      // Refresh failed, clear tokens and redirect to login
      localStorage.removeItem('secbase_access_token')
      localStorage.removeItem('secbase_refresh_token')
      window.location.href = '/login'
    }
  }

  return await response.json()
}

export const environment = new Environment({
  network: Network.create(fetchFn),
  store: new Store(new RecordSource()),
})
