package graph

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

// Dashboard query resolvers

func (r *Resolver) VulnOverview(ctx context.Context) (*repository.VulnOverview, error) {
	var o *repository.VulnOverview
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		o, err = r.DashboardRepo.GetVulnOverview(ctx, tx)
		return err
	})
	return o, err
}

func (r *Resolver) IncidentStatusSummary(ctx context.Context) (*repository.IncidentSummary, error) {
	var s *repository.IncidentSummary
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		s, err = r.DashboardRepo.GetIncidentSummary(ctx, tx)
		return err
	})
	return s, err
}

func (r *Resolver) DrReadiness(ctx context.Context) (*repository.DrReadiness, error) {
	var d *repository.DrReadiness
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		d, err = r.DashboardRepo.GetDrReadiness(ctx, tx)
		return err
	})
	return d, err
}

func (r *Resolver) MyTasks(ctx context.Context) (*repository.MyTasks, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return &repository.MyTasks{}, nil
	}
	var t *repository.MyTasks
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		t, err = r.DashboardRepo.GetMyTasks(ctx, tx, userID)
		return err
	})
	return t, err
}

func (r *Resolver) CveFeed(ctx context.Context, limit *int) ([]*model.CveFeedEntry, error) {
	n := 20
	if limit != nil && *limit > 0 {
		n = *limit
	}
	var entries []*model.CveFeedEntry
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		entries, err = r.DashboardRepo.ListCveFeed(ctx, tx, n)
		return err
	})
	return entries, err
}
