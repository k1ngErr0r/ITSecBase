import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT || '/v1/traces'
const SERVICE_NAME = 'secbase-web'

let provider: WebTracerProvider | null = null

/**
 * Initializes OpenTelemetry browser tracing. Call once at app startup.
 *
 * - Instruments all fetch() calls (including Relay GraphQL requests)
 * - Exports spans via OTLP/HTTP to the collector
 * - Uses Zone.js context manager for async context propagation
 */
export function initTelemetry(): void {
  if (provider) return // Already initialised

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
  })

  const exporter = new OTLPTraceExporter({
    url: OTEL_ENDPOINT,
  })

  provider = new WebTracerProvider({
    resource,
  })

  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: 100,
    scheduledDelayMillis: 5000,
  }))

  provider.register({
    contextManager: new ZoneContextManager(),
  })

  // Auto-instrument fetch (used by Relay)
  const fetchInstrumentation = new FetchInstrumentation({
    propagateTraceHeaderCorsUrls: [/\/graphql/],
    clearTimingResources: true,
  })
  fetchInstrumentation.setTracerProvider(provider)
  fetchInstrumentation.enable()

  console.info('[OTel] Browser tracing initialized', { endpoint: OTEL_ENDPOINT })
}

/**
 * Gracefully shuts down the tracer provider, flushing pending spans.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (provider) {
    await provider.shutdown()
    provider = null
  }
}
