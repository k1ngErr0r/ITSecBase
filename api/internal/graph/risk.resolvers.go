package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

type RiskConnection struct {
	Edges      []*RiskEdge `json:"edges"`
	PageInfo   *PageInfo   `json:"pageInfo"`
	TotalCount int         `json:"totalCount"`
}

type RiskEdge struct {
	Cursor string      `json:"cursor"`
	Node   *model.Risk `json:"node"`
}

func (r *Resolver) Risks(ctx context.Context, first *int, after *string, filter *repository.RiskFilter) (*RiskConnection, error) {
	params := paginationParams(first, after)
	var risks []*model.Risk
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		risks, pr, err = r.RiskRepo.List(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*RiskEdge, len(risks))
	for i, risk := range risks {
		edges[i] = &RiskEdge{Cursor: repository.EncodeCursor(i), Node: risk}
	}
	return &RiskConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) Risk(ctx context.Context, id string) (*model.Risk, error) {
	var risk *model.Risk
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		risk, err = r.RiskRepo.GetByID(ctx, tx, id)
		return err
	})
	return risk, err
}

func (r *Resolver) CreateRisk(ctx context.Context, input CreateRiskInput) (*model.Risk, error) {
	orgID, err := auth.OrgIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	risk := &model.Risk{
		OrgID:              orgID,
		Title:              input.Title,
		Description:        derefStr(input.Description),
		Scenario:           derefStr(input.Scenario),
		Category:           derefStr(input.Category),
		Source:             derefStr(input.Source),
		InherentLikelihood: derefInt(input.InherentLikelihood),
		InherentImpact:     derefInt(input.InherentImpact),
		ResidualLikelihood: derefInt(input.ResidualLikelihood),
		ResidualImpact:     derefInt(input.ResidualImpact),
		Status:             "identified",
		OwnerID:            input.OwnerID,
	}

	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.RiskRepo.Create(ctx, tx, risk)
	})
	return risk, err
}

func (r *Resolver) UpdateRisk(ctx context.Context, id string, input UpdateRiskInput) (*model.Risk, error) {
	var risk *model.Risk
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		risk, err = r.RiskRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if input.Title != nil {
			risk.Title = *input.Title
		}
		if input.Description != nil {
			risk.Description = *input.Description
		}
		if input.Scenario != nil {
			risk.Scenario = *input.Scenario
		}
		if input.Category != nil {
			risk.Category = *input.Category
		}
		if input.InherentLikelihood != nil {
			risk.InherentLikelihood = *input.InherentLikelihood
		}
		if input.InherentImpact != nil {
			risk.InherentImpact = *input.InherentImpact
		}
		if input.ResidualLikelihood != nil {
			risk.ResidualLikelihood = *input.ResidualLikelihood
		}
		if input.ResidualImpact != nil {
			risk.ResidualImpact = *input.ResidualImpact
		}
		if input.Status != nil {
			risk.Status = *input.Status
		}
		if input.OwnerID != nil {
			risk.OwnerID = input.OwnerID
		}
		return r.RiskRepo.Update(ctx, tx, risk)
	})
	return risk, err
}

func (r *Resolver) DeleteRisk(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.RiskRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// Treatment resolvers

func (r *Resolver) CreateRiskTreatment(ctx context.Context, riskID string, input CreateTreatmentInput) (*model.RiskTreatment, error) {
	t := &model.RiskTreatment{
		RiskID:        riskID,
		Action:        input.Action,
		ResponsibleID: input.ResponsibleID,
		Deadline:      input.Deadline,
		Status:        "open",
	}
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.RiskRepo.CreateTreatment(ctx, tx, t)
	})
	return t, err
}

func (r *Resolver) UpdateRiskTreatment(ctx context.Context, id string, input UpdateTreatmentInput) (*model.RiskTreatment, error) {
	var t *model.RiskTreatment
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		t, err = r.RiskRepo.GetTreatment(ctx, tx, id)
		if err != nil {
			return err
		}
		if input.Action != nil {
			t.Action = *input.Action
		}
		if input.ResponsibleID != nil {
			t.ResponsibleID = input.ResponsibleID
		}
		if input.Deadline != nil {
			t.Deadline = input.Deadline
		}
		if input.Status != nil {
			t.Status = *input.Status
		}
		return r.RiskRepo.UpdateTreatment(ctx, tx, t)
	})
	return t, err
}

func (r *Resolver) RiskTreatments(ctx context.Context, risk *model.Risk) ([]*model.RiskTreatment, error) {
	var treatments []*model.RiskTreatment
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		treatments, err = r.RiskRepo.ListTreatments(ctx, tx, risk.ID)
		return err
	})
	return treatments, err
}

func (r *Resolver) RiskMatrixConfig(ctx context.Context) (*model.RiskMatrixConfig, error) {
	var m *model.RiskMatrixConfig
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		m, err = r.RiskRepo.GetMatrixConfig(ctx, tx)
		return err
	})
	return m, err
}

func (r *Resolver) RiskHeatmap(ctx context.Context) ([]repository.HeatmapCell, error) {
	var cells []repository.HeatmapCell
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		cells, err = r.RiskRepo.GetHeatmapData(ctx, tx)
		return err
	})
	return cells, err
}

// Field resolvers

func (r *Resolver) RiskOwner(ctx context.Context, risk *model.Risk) (*model.User, error) {
	if risk.OwnerID == nil {
		return nil, nil
	}
	return r.resolveUser(ctx, *risk.OwnerID)
}

func (r *Resolver) RiskInherentLevel(risk *model.Risk) int {
	return risk.InherentLikelihood * risk.InherentImpact
}

func (r *Resolver) RiskResidualLevel(risk *model.Risk) int {
	return risk.ResidualLikelihood * risk.ResidualImpact
}

func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

// Input types

type CreateRiskInput struct {
	Title              string  `json:"title"`
	Description        *string `json:"description"`
	Scenario           *string `json:"scenario"`
	Category           *string `json:"category"`
	Source             *string `json:"source"`
	InherentLikelihood *int    `json:"inherentLikelihood"`
	InherentImpact     *int    `json:"inherentImpact"`
	ResidualLikelihood *int    `json:"residualLikelihood"`
	ResidualImpact     *int    `json:"residualImpact"`
	OwnerID            *string `json:"ownerId"`
}

type UpdateRiskInput struct {
	Title              *string `json:"title"`
	Description        *string `json:"description"`
	Scenario           *string `json:"scenario"`
	Category           *string `json:"category"`
	InherentLikelihood *int    `json:"inherentLikelihood"`
	InherentImpact     *int    `json:"inherentImpact"`
	ResidualLikelihood *int    `json:"residualLikelihood"`
	ResidualImpact     *int    `json:"residualImpact"`
	Status             *string `json:"status"`
	OwnerID            *string `json:"ownerId"`
}

type CreateTreatmentInput struct {
	Action        string       `json:"action"`
	ResponsibleID *string      `json:"responsibleId"`
	Deadline      *interface{} `json:"deadline"`
	Status        *string      `json:"status"`
}

type UpdateTreatmentInput struct {
	Action        *string      `json:"action"`
	ResponsibleID *string      `json:"responsibleId"`
	Deadline      *interface{} `json:"deadline"`
	Status        *string      `json:"status"`
}
