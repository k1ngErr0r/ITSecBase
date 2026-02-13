package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithOrgID_and_OrgIDFromContext(t *testing.T) {
	ctx := context.Background()
	orgID := "org-123"

	// Store org ID in context
	ctx = WithOrgID(ctx, orgID)

	// Retrieve org ID from context
	retrievedOrgID, ok := OrgIDFromContext(ctx)

	if !ok {
		t.Error("expected ok to be true")
	}

	if retrievedOrgID != orgID {
		t.Errorf("expected org ID %q, got %q", orgID, retrievedOrgID)
	}
}

func TestOrgIDFromContext_Missing(t *testing.T) {
	ctx := context.Background()

	orgID, ok := OrgIDFromContext(ctx)

	if ok {
		t.Error("expected ok to be false when org ID is not in context")
	}

	if orgID != "" {
		t.Errorf("expected empty string, got %q", orgID)
	}
}

func TestOrgIDFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	ctx = WithOrgID(ctx, "")

	orgID, ok := OrgIDFromContext(ctx)

	if ok {
		t.Error("expected ok to be false when org ID is empty string")
	}

	if orgID != "" {
		t.Errorf("expected empty string, got %q", orgID)
	}
}

func TestOrgIDFromContext_WrongType(t *testing.T) {
	ctx := context.Background()
	// Store a non-string value with the same key
	ctx = context.WithValue(ctx, orgIDKey, 12345)

	orgID, ok := OrgIDFromContext(ctx)

	if ok {
		t.Error("expected ok to be false when value is not a string")
	}

	if orgID != "" {
		t.Errorf("expected empty string, got %q", orgID)
	}
}

func TestTenantMiddleware_PassThrough(t *testing.T) {
	handlerCalled := false
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	middleware := TenantMiddleware(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	if !handlerCalled {
		t.Error("expected next handler to be called")
	}

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestTenantMiddleware_WithOrgID(t *testing.T) {
	capturedCtx := context.Background()
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	middleware := TenantMiddleware(nextHandler)

	// Create request with org ID in context
	ctx := WithOrgID(context.Background(), "org-456")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify org ID is still in context after middleware
	orgID, ok := OrgIDFromContext(capturedCtx)
	if !ok {
		t.Error("expected org ID to be present in context")
	}

	if orgID != "org-456" {
		t.Errorf("expected org ID 'org-456', got %q", orgID)
	}
}

func TestTenantMiddleware_WithoutOrgID(t *testing.T) {
	capturedCtx := context.Background()
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	middleware := TenantMiddleware(nextHandler)

	// Create request without org ID in context
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify middleware doesn't fail when org ID is absent
	_, ok := OrgIDFromContext(capturedCtx)
	if ok {
		t.Error("expected org ID to be absent from context")
	}

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestWithOrgID_OverwriteExisting(t *testing.T) {
	ctx := context.Background()

	// Set initial org ID
	ctx = WithOrgID(ctx, "org-old")

	// Overwrite with new org ID
	ctx = WithOrgID(ctx, "org-new")

	orgID, ok := OrgIDFromContext(ctx)
	if !ok {
		t.Error("expected ok to be true")
	}

	if orgID != "org-new" {
		t.Errorf("expected org ID 'org-new' (overwritten value), got %q", orgID)
	}
}

func TestOrgIDFromContext_WhitespaceOnly(t *testing.T) {
	ctx := context.Background()
	ctx = WithOrgID(ctx, "   ")

	// The function checks for empty string, but whitespace should be considered valid
	orgID, ok := OrgIDFromContext(ctx)

	if !ok {
		t.Error("expected ok to be true for whitespace org ID")
	}

	if orgID != "   " {
		t.Errorf("expected whitespace string, got %q", orgID)
	}
}

func TestTenantMiddleware_MultipleRequests(t *testing.T) {
	requestCount := 0
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.WriteHeader(http.StatusOK)
	})

	middleware := TenantMiddleware(nextHandler)

	// Send multiple requests through the same middleware
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()
		middleware.ServeHTTP(rec, req)
	}

	if requestCount != 5 {
		t.Errorf("expected 5 requests to be processed, got %d", requestCount)
	}
}

func TestTenantMiddleware_PreservesOtherContextValues(t *testing.T) {
	type contextKey string
	const customKey contextKey = "custom"

	capturedCtx := context.Background()
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	middleware := TenantMiddleware(nextHandler)

	// Create context with both org ID and custom value
	ctx := context.Background()
	ctx = context.WithValue(ctx, customKey, "custom-value")
	ctx = WithOrgID(ctx, "org-789")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	middleware.ServeHTTP(rec, req)

	// Verify both values are preserved
	orgID, ok := OrgIDFromContext(capturedCtx)
	if !ok || orgID != "org-789" {
		t.Errorf("expected org ID 'org-789', got %q (ok=%v)", orgID, ok)
	}

	customValue, ok := capturedCtx.Value(customKey).(string)
	if !ok || customValue != "custom-value" {
		t.Errorf("expected custom value 'custom-value', got %q (ok=%v)", customValue, ok)
	}
}
