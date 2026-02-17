package auth

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/k1ngErr0r/ITSecBase/api/internal/middleware"
)

// Middleware returns an HTTP middleware that validates JWT tokens.
// Unauthenticated requests to excluded paths are allowed through.
func Middleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow GET requests to playground root
			if r.Method == http.MethodGet && r.URL.Path == "/" {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// GraphQL endpoint needs auth, but login/refresh mutations
				// are handled inside resolvers which check auth themselves.
				// Allow unauthenticated GraphQL requests through so the
				// resolver can handle login/refresh mutations.
				if r.URL.Path == "/graphql" {
					next.ServeHTTP(w, r)
					return
				}
				writeError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				writeError(w, http.StatusUnauthorized, "invalid authorization format")
				return
			}

			claims, err := ValidateAccessToken(parts[1], secret)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			// Inject claims and org_id into context
			ctx := WithClaims(r.Context(), claims)
			ctx = middleware.WithOrgID(ctx, claims.OrgID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
