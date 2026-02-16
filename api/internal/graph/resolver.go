package graph

import (
	"github.com/k1ngErr0r/ITSecBase/api/internal/config"
	"github.com/k1ngErr0r/ITSecBase/api/internal/database"
	"github.com/k1ngErr0r/ITSecBase/api/internal/repository"
)

// Resolver is the root resolver holding shared dependencies.
// It is the entry point for all GraphQL resolvers.
type Resolver struct {
	DB              *database.DB
	Config          *config.Config
	UserRepo        *repository.UserRepo
	AssetRepo       *repository.AssetRepo
	VulnRepo        *repository.VulnerabilityRepo
	RiskRepo        *repository.RiskRepo
	IncidentRepo    *repository.IncidentRepo
	DrPlanRepo      *repository.DrPlanRepo
	IsoControlRepo  *repository.IsoControlRepo
	CommentRepo     *repository.CommentRepo
	EvidenceRepo    *repository.EvidenceRepo
	DashboardRepo   *repository.DashboardRepo
}

// NewResolver constructs a Resolver with all repository dependencies.
func NewResolver(db *database.DB, cfg *config.Config) *Resolver {
	return &Resolver{
		DB:              db,
		Config:          cfg,
		UserRepo:        repository.NewUserRepo(),
		AssetRepo:       repository.NewAssetRepo(),
		VulnRepo:        repository.NewVulnerabilityRepo(),
		RiskRepo:        repository.NewRiskRepo(),
		IncidentRepo:    repository.NewIncidentRepo(),
		DrPlanRepo:      repository.NewDrPlanRepo(),
		IsoControlRepo:  repository.NewIsoControlRepo(),
		CommentRepo:     repository.NewCommentRepo(),
		EvidenceRepo:    repository.NewEvidenceRepo(),
		DashboardRepo:   repository.NewDashboardRepo(),
	}
}
