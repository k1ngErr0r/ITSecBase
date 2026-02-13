package auth

import (
	"context"
)

type claimsKeyType struct{}

var claimsKey = claimsKeyType{}

// WithClaims stores JWT claims in the context.
func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

// ClaimsFromContext extracts JWT claims from the context.
func ClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claimsKey).(*Claims)
	return claims, ok
}

// OrgIDFromContext extracts the organisation ID from JWT claims in context.
func OrgIDFromContext(ctx context.Context) (string, bool) {
	claims, ok := ClaimsFromContext(ctx)
	if !ok {
		return "", false
	}
	return claims.OrgID, claims.OrgID != ""
}

// UserIDFromContext extracts the user ID from JWT claims in context.
func UserIDFromContext(ctx context.Context) (string, bool) {
	claims, ok := ClaimsFromContext(ctx)
	if !ok {
		return "", false
	}
	return claims.UserID, claims.UserID != ""
}
