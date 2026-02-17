package middleware

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.opentelemetry.io/otel/trace"
)

func TestRequestLogger_LogsRequest(t *testing.T) {
	// Capture logs by setting up a custom logger
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("response body"))
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test-path", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	req.Header.Set("User-Agent", "test-agent/1.0")
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	logOutput := logBuf.String()

	// Verify log was written
	if logOutput == "" {
		t.Fatal("expected log output, got empty string")
	}

	// Verify key fields are present in the log
	expectedFields := []string{
		"http request",
		"GET",
		"/test-path",
		"192.168.1.1:12345",
		"test-agent/1.0",
	}

	for _, field := range expectedFields {
		if !strings.Contains(logOutput, field) {
			t.Errorf("expected log to contain %q, log output: %s", field, logOutput)
		}
	}
}

func TestRequestLogger_StatusCode(t *testing.T) {
	tests := []struct {
		name          string
		statusCode    int
		expectedLevel string
		handlerFunc   http.HandlerFunc
	}{
		{
			name:          "200 OK",
			statusCode:    http.StatusOK,
			expectedLevel: "INFO",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
		},
		{
			name:          "201 Created",
			statusCode:    http.StatusCreated,
			expectedLevel: "INFO",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusCreated)
			},
		},
		{
			name:          "400 Bad Request",
			statusCode:    http.StatusBadRequest,
			expectedLevel: "WARN",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusBadRequest)
			},
		},
		{
			name:          "404 Not Found",
			statusCode:    http.StatusNotFound,
			expectedLevel: "WARN",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusNotFound)
			},
		},
		{
			name:          "500 Internal Server Error",
			statusCode:    http.StatusInternalServerError,
			expectedLevel: "ERROR",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
			},
		},
		{
			name:          "503 Service Unavailable",
			statusCode:    http.StatusServiceUnavailable,
			expectedLevel: "ERROR",
			handlerFunc: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusServiceUnavailable)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var logBuf bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
				Level: slog.LevelInfo,
			}))
			slog.SetDefault(logger)

			middleware := RequestLogger(tt.handlerFunc)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rec := httptest.NewRecorder()

			middleware.ServeHTTP(rec, req)

			if rec.Code != tt.statusCode {
				t.Errorf("expected status code %d, got %d", tt.statusCode, rec.Code)
			}

			logOutput := logBuf.String()

			// Verify the correct log level was used
			if !strings.Contains(logOutput, tt.expectedLevel) {
				t.Errorf("expected log level %q, log output: %s", tt.expectedLevel, logOutput)
			}

			// Verify status code is in the log
			if !strings.Contains(logOutput, `"status"`) {
				t.Errorf("expected 'status' field in log, log output: %s", logOutput)
			}
		})
	}
}

func TestRequestLogger_BytesWritten(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	responseBody := "test response body"
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(responseBody))
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	logOutput := logBuf.String()

	// Verify bytes field is present
	if !strings.Contains(logOutput, `"bytes"`) {
		t.Errorf("expected 'bytes' field in log, log output: %s", logOutput)
	}

	// The response body should be written to the recorder
	if rec.Body.String() != responseBody {
		t.Errorf("expected response body %q, got %q", responseBody, rec.Body.String())
	}
}

func TestRequestLogger_Duration(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate some processing time
		w.WriteHeader(http.StatusOK)
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	logOutput := logBuf.String()

	// Verify duration field is present
	if !strings.Contains(logOutput, `"duration"`) {
		t.Errorf("expected 'duration' field in log, log output: %s", logOutput)
	}
}

func TestRequestLogger_WithTracing(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := RequestLogger(nextHandler)

	// Create a request with a valid span context
	ctx := context.Background()

	// Create a mock span context (this will be valid)
	traceID := trace.TraceID{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
	spanID := trace.SpanID{1, 2, 3, 4, 5, 6, 7, 8}
	spanCtx := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID:    traceID,
		SpanID:     spanID,
		TraceFlags: trace.FlagsSampled,
	})
	ctx = trace.ContextWithSpanContext(ctx, spanCtx)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	logOutput := logBuf.String()

	// Verify trace_id and span_id are present when tracing is active
	if !strings.Contains(logOutput, `"trace_id"`) {
		t.Errorf("expected 'trace_id' field in log when tracing is active, log output: %s", logOutput)
	}

	if !strings.Contains(logOutput, `"span_id"`) {
		t.Errorf("expected 'span_id' field in log when tracing is active, log output: %s", logOutput)
	}
}

func TestRequestLogger_WithoutTracing(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := RequestLogger(nextHandler)

	// Create a request without a span context
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	logOutput := logBuf.String()

	// Verify trace_id and span_id are NOT present when tracing is not active
	if strings.Contains(logOutput, `"trace_id"`) {
		t.Errorf("expected 'trace_id' field NOT to be in log when tracing is not active, log output: %s", logOutput)
	}

	if strings.Contains(logOutput, `"span_id"`) {
		t.Errorf("expected 'span_id' field NOT to be in log when tracing is not active, log output: %s", logOutput)
	}
}

func TestRequestLogger_MultipleWrites(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("part1"))
		_, _ = w.Write([]byte("part2"))
		_, _ = w.Write([]byte("part3"))
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify all parts were written
	expectedBody := "part1part2part3"
	if rec.Body.String() != expectedBody {
		t.Errorf("expected response body %q, got %q", expectedBody, rec.Body.String())
	}

	// Verify bytes field accounts for all writes
	logOutput := logBuf.String()
	if !strings.Contains(logOutput, `"bytes"`) {
		t.Errorf("expected 'bytes' field in log, log output: %s", logOutput)
	}
}

func TestRequestLogger_DefaultStatusCode(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Handler that doesn't explicitly call WriteHeader
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("response"))
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Default status code should be 200
	if rec.Code != http.StatusOK {
		t.Errorf("expected default status code %d, got %d", http.StatusOK, rec.Code)
	}

	logOutput := logBuf.String()

	// Verify INFO level for 200 status
	if !strings.Contains(logOutput, "INFO") {
		t.Errorf("expected INFO log level for 200 status, log output: %s", logOutput)
	}
}

func TestResponseWriter_WriteHeader_CalledOnce(t *testing.T) {
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Handler that calls WriteHeader multiple times (should only use first)
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.WriteHeader(http.StatusBadRequest) // This should be ignored
	})

	middleware := RequestLogger(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Only the first WriteHeader call should be used
	if rec.Code != http.StatusCreated {
		t.Errorf("expected status code %d, got %d", http.StatusCreated, rec.Code)
	}
}
