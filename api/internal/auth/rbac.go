package auth

import (
	"context"
	"fmt"
)

const (
	RoleAdmin   = "admin"
	RoleAnalyst = "analyst"
	RoleViewer  = "viewer"
)

// RequireRole checks that the authenticated user has at least one of the required roles.
func RequireRole(ctx context.Context, roles ...string) error {
	claims, ok := ClaimsFromContext(ctx)
	if !ok {
		return fmt.Errorf("authentication required")
	}

	for _, required := range roles {
		for _, userRole := range claims.Roles {
			if userRole == required {
				return nil
			}
		}
	}

	return fmt.Errorf("permission denied: requires one of roles %v", roles)
}

// HasRole checks if the authenticated user has the specified role without returning an error.
func HasRole(ctx context.Context, role string) bool {
	claims, ok := ClaimsFromContext(ctx)
	if !ok {
		return false
	}

	for _, r := range claims.Roles {
		if r == role {
			return true
		}
	}
	return false
}
