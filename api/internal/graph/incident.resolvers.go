package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

type IncidentConnection struct {
	Edges      []*IncidentEdge `json:"edges"`
	PageInfo   *PageInfo       `json:"pageInfo"`
	TotalCount int             `json:"totalCount"`
}

type IncidentEdge struct {
	Cursor string          `json:"cursor"`
	Node   *model.Incident `json:"node"`
}

func (r *Resolver) Incidents(ctx context.Context, first *int, after *string, filter *repository.IncidentFilter) (*IncidentConnection, error) {
	params := paginationParams(first, after)
	var incidents []*model.Incident
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		incidents, pr, err = r.IncidentRepo.List(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*IncidentEdge, len(incidents))
	for i, inc := range incidents {
		edges[i] = &IncidentEdge{Cursor: repository.EncodeCursor(i), Node: inc}
	}
	return &IncidentConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) Incident(ctx context.Context, id string) (*model.Incident, error) {
	var inc *model.Incident
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		inc, err = r.IncidentRepo.GetByID(ctx, tx, id)
		return err
	})
	return inc, err
}

func (r *Resolver) CreateIncident(ctx context.Context, input CreateIncidentInput) (*model.Incident, error) {
	orgID, ok := auth.OrgIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	reporterID, _ := auth.UserIDFromContext(ctx)

	inc := &model.Incident{
		OrgID:            orgID,
		Name:             input.Name,
		Area:             derefStr(input.Area),
		Description:      derefStr(input.Description),
		ImpactSummary:    derefStr(input.ImpactSummary),
		ImpactRating:     derefStr(input.ImpactRating),
		RegulatoryBreach: input.RegulatoryBreach != nil && *input.RegulatoryBreach,
		ReporterID:       &reporterID,
		OwnerID:          input.OwnerID,
		Status:           "new",
	}
	if input.Classification != nil {
		inc.Classification = input.Classification
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.IncidentRepo.Create(ctx, tx, inc)
	})
	return inc, err
}

func (r *Resolver) UpdateIncident(ctx context.Context, id string, input UpdateIncidentInput) (*model.Incident, error) {
	var inc *model.Incident
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		inc, err = r.IncidentRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if input.Name != nil {
			inc.Name = *input.Name
		}
		if input.Area != nil {
			inc.Area = *input.Area
		}
		if input.Description != nil {
			inc.Description = *input.Description
		}
		if input.ImpactSummary != nil {
			inc.ImpactSummary = *input.ImpactSummary
		}
		if input.ImpactRating != nil {
			inc.ImpactRating = *input.ImpactRating
		}
		if input.Classification != nil {
			inc.Classification = input.Classification
		}
		if input.Status != nil {
			inc.Status = *input.Status
		}
		if input.RootCause != nil {
			inc.RootCause = *input.RootCause
		}
		if input.RootCauseCategory != nil {
			inc.RootCauseCategory = *input.RootCauseCategory
		}
		if input.OwnerID != nil {
			inc.OwnerID = input.OwnerID
		}
		return r.IncidentRepo.Update(ctx, tx, inc)
	})
	return inc, err
}

func (r *Resolver) DeleteIncident(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.IncidentRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// Action resolvers

func (r *Resolver) CreateIncidentAction(ctx context.Context, incidentID string, input CreateActionInput) (*model.IncidentAction, error) {
	a := &model.IncidentAction{
		IncidentID:  incidentID,
		ActionType:  input.ActionType,
		Description: input.Description,
		OwnerID:     input.OwnerID,
		Status:      "open",
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.IncidentRepo.CreateAction(ctx, tx, a)
	})
	return a, err
}

func (r *Resolver) UpdateIncidentAction(ctx context.Context, id string, input UpdateActionInput) (*model.IncidentAction, error) {
	// For simplicity, load directly
	a := &model.IncidentAction{ID: id}
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		if input.Description != nil {
			a.Description = *input.Description
		}
		if input.OwnerID != nil {
			a.OwnerID = input.OwnerID
		}
		if input.Status != nil {
			a.Status = *input.Status
		}
		return r.IncidentRepo.UpdateAction(ctx, tx, a)
	})
	return a, err
}

func (r *Resolver) IncidentActions(ctx context.Context, inc *model.Incident) ([]*model.IncidentAction, error) {
	var actions []*model.IncidentAction
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		actions, err = r.IncidentRepo.ListActions(ctx, tx, inc.ID)
		return err
	})
	return actions, err
}

// Field resolvers

func (r *Resolver) IncidentOwner(ctx context.Context, inc *model.Incident) (*model.User, error) {
	if inc.OwnerID == nil {
		return nil, nil
	}
	return r.resolveUser(ctx, *inc.OwnerID)
}

func (r *Resolver) IncidentReporter(ctx context.Context, inc *model.Incident) (*model.User, error) {
	if inc.ReporterID == nil {
		return nil, nil
	}
	return r.resolveUser(ctx, *inc.ReporterID)
}

// Input types

type CreateIncidentInput struct {
	Name             string   `json:"name"`
	Area             *string  `json:"area"`
	Description      *string  `json:"description"`
	ImpactSummary    *string  `json:"impactSummary"`
	ImpactRating     *string  `json:"impactRating"`
	Classification   []string `json:"classification"`
	RegulatoryBreach *bool    `json:"regulatoryBreach"`
	OwnerID          *string  `json:"ownerId"`
}

type UpdateIncidentInput struct {
	Name              *string  `json:"name"`
	Area              *string  `json:"area"`
	Description       *string  `json:"description"`
	ImpactSummary     *string  `json:"impactSummary"`
	ImpactRating      *string  `json:"impactRating"`
	Classification    []string `json:"classification"`
	Status            *string  `json:"status"`
	RootCause         *string  `json:"rootCause"`
	RootCauseCategory *string  `json:"rootCauseCategory"`
	OwnerID           *string  `json:"ownerId"`
}

type CreateActionInput struct {
	ActionType  string  `json:"actionType"`
	Description string  `json:"description"`
	OwnerID     *string `json:"ownerId"`
}

type UpdateActionInput struct {
	Description *string `json:"description"`
	OwnerID     *string `json:"ownerId"`
	Status      *string `json:"status"`
}
