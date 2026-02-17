package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	oteltrace "go.opentelemetry.io/otel/trace"
	"go.opentelemetry.io/otel/trace/noop"
)

func TestTracingMiddleware_CreatesSpan(t *testing.T) {
	// Set up a span recorder to capture spans
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("response"))
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test-path", nil)
	req.Header.Set("User-Agent", "test-agent")
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify a span was created
	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}

	span := spans[0]

	// Verify span name
	expectedSpanName := "GET /test-path"
	if span.Name() != expectedSpanName {
		t.Errorf("expected span name %q, got %q", expectedSpanName, span.Name())
	}

	// Verify span kind
	if span.SpanKind() != oteltrace.SpanKindServer {
		t.Errorf("expected span kind %v, got %v", oteltrace.SpanKindServer, span.SpanKind())
	}

	// Verify span attributes
	attrs := span.Attributes()
	attrMap := make(map[string]interface{})
	for _, attr := range attrs {
		attrMap[string(attr.Key)] = attr.Value.AsInterface()
	}

	if method, ok := attrMap["http.method"]; !ok || method != "GET" {
		t.Errorf("expected http.method attribute to be 'GET', got %v", method)
	}

	if target, ok := attrMap["http.target"]; !ok || target != "/test-path" {
		t.Errorf("expected http.target attribute to be '/test-path', got %v", target)
	}

	if statusCode, ok := attrMap["http.status_code"]; !ok || statusCode != int64(200) {
		t.Errorf("expected http.status_code attribute to be 200, got %v", statusCode)
	}
}

func TestTracingMiddleware_NoOpWhenNotConfigured(t *testing.T) {
	// Use default no-op tracer provider
	otel.SetTracerProvider(noop.NewTracerProvider())

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	// Should not panic or error
	middleware.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestTracingMiddleware_PropagatesContext(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	var capturedContext context.Context
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedContext = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify context has span
	spanCtx := oteltrace.SpanContextFromContext(capturedContext)
	if !spanCtx.IsValid() {
		t.Error("expected valid span context in request context")
	}
}

func TestTracingMiddleware_IncludesOrgID(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	// Create request with org ID in context
	ctx := WithOrgID(context.Background(), "org-123")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify span includes org ID attribute
	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}

	attrs := spans[0].Attributes()
	found := false
	for _, attr := range attrs {
		if string(attr.Key) == "tenant.org_id" {
			if attr.Value.AsString() != "org-123" {
				t.Errorf("expected tenant.org_id to be 'org-123', got %q", attr.Value.AsString())
			}
			found = true
			break
		}
	}

	if !found {
		t.Error("expected tenant.org_id attribute in span")
	}
}

func TestTracingMiddleware_WithoutOrgID(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify span doesn't have org ID attribute when not present
	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}

	attrs := spans[0].Attributes()
	for _, attr := range attrs {
		if string(attr.Key) == "tenant.org_id" {
			t.Error("expected no tenant.org_id attribute when org ID not in context")
		}
	}
}

func TestTracingMiddleware_StatusCodeAttributes(t *testing.T) {
	tests := []struct {
		name        string
		statusCode  int
		expectError bool
	}{
		{
			name:        "2xx success",
			statusCode:  http.StatusOK,
			expectError: false,
		},
		{
			name:        "4xx client error",
			statusCode:  http.StatusBadRequest,
			expectError: false,
		},
		{
			name:        "5xx server error",
			statusCode:  http.StatusInternalServerError,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spanRecorder := tracetest.NewSpanRecorder()
			tracerProvider := trace.NewTracerProvider(
				trace.WithSpanProcessor(spanRecorder),
			)
			otel.SetTracerProvider(tracerProvider)
			defer otel.SetTracerProvider(noop.NewTracerProvider())

			nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
			})

			middleware := TracingMiddleware(nextHandler)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rec := httptest.NewRecorder()

			middleware.ServeHTTP(rec, req)

			spans := spanRecorder.Ended()
			if len(spans) != 1 {
				t.Fatalf("expected 1 span, got %d", len(spans))
			}

			attrs := spans[0].Attributes()
			attrMap := make(map[string]interface{})
			for _, attr := range attrs {
				attrMap[string(attr.Key)] = attr.Value.AsInterface()
			}

			if statusCode, ok := attrMap["http.status_code"]; !ok || statusCode != int64(tt.statusCode) {
				t.Errorf("expected http.status_code to be %d, got %v", tt.statusCode, statusCode)
			}

			hasErrorAttr := false
			if errorVal, ok := attrMap["error"]; ok {
				hasErrorAttr = errorVal.(bool)
			}

			if tt.expectError && !hasErrorAttr {
				t.Error("expected error attribute to be true for 5xx status")
			}

			if !tt.expectError && hasErrorAttr {
				t.Error("expected no error attribute for non-5xx status")
			}
		})
	}
}

func TestTracingMiddleware_ResponseContentLength(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	responseBody := "test response body"
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(responseBody))
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}

	attrs := spans[0].Attributes()
	found := false
	for _, attr := range attrs {
		if string(attr.Key) == "http.response_content_length" {
			if attr.Value.AsInt64() != int64(len(responseBody)) {
				t.Errorf("expected response content length %d, got %d", len(responseBody), attr.Value.AsInt64())
			}
			found = true
			break
		}
	}

	if !found {
		t.Error("expected http.response_content_length attribute in span")
	}
}

func TestTracingMiddleware_InjectsTraceContext(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	defer func() {
		otel.SetTracerProvider(noop.NewTracerProvider())
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator())
	}()

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify traceparent header was injected into response
	traceparent := rec.Header().Get("traceparent")
	if traceparent == "" {
		t.Error("expected traceparent header to be set in response")
	}
}

func TestTracingMiddleware_ExtractsIncomingTraceContext(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	defer func() {
		otel.SetTracerProvider(noop.NewTracerProvider())
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator())
	}()

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	// Create a parent span and inject its context into request headers
	ctx := context.Background()
	tracer := otel.Tracer("test")
	parentCtx, parentSpan := tracer.Start(ctx, "parent")
	defer parentSpan.End()

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	propagator := propagation.TraceContext{}
	propagator.Inject(parentCtx, propagation.HeaderCarrier(req.Header))

	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify the span was created with the parent context
	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span from middleware, got %d", len(spans))
	}

	childSpan := spans[0]
	parentSpanCtx := parentSpan.SpanContext()

	// The child span should have the same trace ID as the parent
	if childSpan.SpanContext().TraceID() != parentSpanCtx.TraceID() {
		t.Errorf("expected child span to have parent's trace ID %s, got %s",
			parentSpanCtx.TraceID().String(),
			childSpan.SpanContext().TraceID().String())
	}
}

func TestTracingMiddleware_UserAgent(t *testing.T) {
	spanRecorder := tracetest.NewSpanRecorder()
	tracerProvider := trace.NewTracerProvider(
		trace.WithSpanProcessor(spanRecorder),
	)
	otel.SetTracerProvider(tracerProvider)
	defer otel.SetTracerProvider(noop.NewTracerProvider())

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := TracingMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("User-Agent", "custom-agent/2.0")
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	spans := spanRecorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}

	attrs := spans[0].Attributes()
	found := false
	for _, attr := range attrs {
		if string(attr.Key) == "user_agent.original" {
			if attr.Value.AsString() != "custom-agent/2.0" {
				t.Errorf("expected user agent 'custom-agent/2.0', got %q", attr.Value.AsString())
			}
			found = true
			break
		}
	}

	if !found {
		t.Error("expected user_agent.original attribute in span")
	}
}
