package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"go.opentelemetry.io/otel/trace"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += n
	return n, err
}

// RequestLogger logs each HTTP request with structured fields.
// Includes trace_id and span_id when OpenTelemetry tracing is active.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := newResponseWriter(w)

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rw.statusCode),
			slog.Duration("duration", duration),
			slog.Int("bytes", rw.bytesWritten),
			slog.String("remote", r.RemoteAddr),
			slog.String("user_agent", r.UserAgent()),
		}

		// Correlate logs with traces when OTel is active
		spanCtx := trace.SpanContextFromContext(r.Context())
		if spanCtx.IsValid() {
			attrs = append(attrs,
				slog.String("trace_id", spanCtx.TraceID().String()),
				slog.String("span_id", spanCtx.SpanID().String()),
			)
		}

		level := slog.LevelInfo
		if rw.statusCode >= 500 {
			level = slog.LevelError
		} else if rw.statusCode >= 400 {
			level = slog.LevelWarn
		}

		slog.LogAttrs(r.Context(), level, "http request", attrs...)
	})
}
