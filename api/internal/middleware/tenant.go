package middleware

import (
	"context"
	"net/http"
)

type ctxKey int

const (
	orgIDKey ctxKey = iota
)

// WithOrgID stores the organisation ID in the context.
func WithOrgID(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, orgIDKey, orgID)
}

// OrgIDFromContext extracts the organisation ID from the context.
func OrgIDFromContext(ctx context.Context) (string, bool) {
	orgID, ok := ctx.Value(orgIDKey).(string)
	return orgID, ok && orgID != ""
}

// TenantMiddleware reads the org_id set by auth middleware and stores it
// in the context for the database layer to use when setting RLS variables.
func TenantMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// org_id is injected by auth middleware via WithOrgID.
		// If not present (unauthenticated routes), we pass through silently.
		next.ServeHTTP(w, r)
	})
}
