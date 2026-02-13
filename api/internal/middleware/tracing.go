package middleware

import (
	"fmt"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace"
)

const tracerName = "secbase-api/middleware"

// TracingMiddleware creates a root span for each HTTP request with standard
// semantic conventions. It propagates incoming trace context (W3C traceparent)
// and injects the trace ID into the request context for downstream use.
func TracingMiddleware(next http.Handler) http.Handler {
	tracer := otel.Tracer(tracerName)
	propagator := otel.GetTextMapPropagator()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract incoming trace context from request headers
		ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))

		spanName := fmt.Sprintf("%s %s", r.Method, r.URL.Path)
		ctx, span := tracer.Start(ctx, spanName,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				semconv.HTTPMethodKey.String(r.Method),
				semconv.HTTPTargetKey.String(r.URL.Path),
				semconv.HTTPSchemeKey.String(r.URL.Scheme),
				semconv.UserAgentOriginal(r.UserAgent()),
				semconv.HTTPRequestContentLength(int(r.ContentLength)),
				attribute.String("http.client_ip", r.RemoteAddr),
			),
		)
		defer span.End()

		// Add user/tenant attributes if available from auth middleware
		if orgID, ok := OrgIDFromContext(ctx); ok {
			span.SetAttributes(attribute.String("tenant.org_id", orgID))
		}

		// Wrap response writer to capture status code
		tw := &tracingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Inject trace context into response headers for downstream correlation
		propagator.Inject(ctx, propagation.HeaderCarrier(w.Header()))

		next.ServeHTTP(tw, r.WithContext(ctx))

		// Set response attributes
		span.SetAttributes(
			semconv.HTTPStatusCode(tw.statusCode),
			attribute.Int("http.response_content_length", tw.bytesWritten),
		)

		if tw.statusCode >= 500 {
			span.SetAttributes(attribute.Bool("error", true))
		}
	})
}

type tracingResponseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int
}

func (w *tracingResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *tracingResponseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.bytesWritten += n
	return n, err
}
