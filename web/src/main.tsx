import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { RelayEnvironmentProvider } from 'react-relay'
import App from './App'
import { environment } from './relay/environment'
import { initTelemetry } from './telemetry/init'
import './index.css'

// Initialize OpenTelemetry browser tracing (instruments fetch for Relay)
initTelemetry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RelayEnvironmentProvider environment={environment}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RelayEnvironmentProvider>
  </React.StrictMode>,
)
