package graph

import (
	"github.com/jmcintyre/secbase/api/internal/config"
	"github.com/jmcintyre/secbase/api/internal/database"
)

// Resolver is the root resolver holding shared dependencies.
// It is the entry point for all GraphQL resolvers.
type Resolver struct {
	DB     *database.DB
	Config *config.Config
}
