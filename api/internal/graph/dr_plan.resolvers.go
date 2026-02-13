package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

type DrPlanConnection struct {
	Edges      []*DrPlanEdge `json:"edges"`
	PageInfo   *PageInfo     `json:"pageInfo"`
	TotalCount int           `json:"totalCount"`
}

type DrPlanEdge struct {
	Cursor string        `json:"cursor"`
	Node   *model.DrPlan `json:"node"`
}

func (r *Resolver) DrPlans(ctx context.Context, first *int, after *string, filter *repository.DrPlanFilter) (*DrPlanConnection, error) {
	params := paginationParams(first, after)
	var plans []*model.DrPlan
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		plans, pr, err = r.DrPlanRepo.List(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*DrPlanEdge, len(plans))
	for i, p := range plans {
		edges[i] = &DrPlanEdge{Cursor: repository.EncodeCursor(i), Node: p}
	}
	return &DrPlanConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) DrPlan(ctx context.Context, id string) (*model.DrPlan, error) {
	var plan *model.DrPlan
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		plan, err = r.DrPlanRepo.GetByID(ctx, tx, id)
		return err
	})
	return plan, err
}

func (r *Resolver) CreateDrPlan(ctx context.Context, input CreateDrPlanInput) (*model.DrPlan, error) {
	orgID, ok := auth.OrgIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	p := &model.DrPlan{
		OrgID:      orgID,
		Name:       input.Name,
		Scope:      derefStr(input.Scope),
		OwnerID:    input.OwnerID,
		Version:    derefStr(input.Version),
		RTOMinutes: input.RTOMinutes,
		RPOMinutes: input.RPOMinutes,
		Playbook:   derefStr(input.Playbook),
		Status:     "draft",
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.DrPlanRepo.Create(ctx, tx, p)
	})
	return p, err
}

func (r *Resolver) UpdateDrPlan(ctx context.Context, id string, input UpdateDrPlanInput) (*model.DrPlan, error) {
	var p *model.DrPlan
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		p, err = r.DrPlanRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if input.Name != nil {
			p.Name = *input.Name
		}
		if input.Scope != nil {
			p.Scope = *input.Scope
		}
		if input.OwnerID != nil {
			p.OwnerID = input.OwnerID
		}
		if input.Version != nil {
			p.Version = *input.Version
		}
		if input.RTOMinutes != nil {
			p.RTOMinutes = input.RTOMinutes
		}
		if input.RPOMinutes != nil {
			p.RPOMinutes = input.RPOMinutes
		}
		if input.Playbook != nil {
			p.Playbook = *input.Playbook
		}
		if input.Status != nil {
			p.Status = *input.Status
		}
		return r.DrPlanRepo.Update(ctx, tx, p)
	})
	return p, err
}

func (r *Resolver) DeleteDrPlan(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.DrPlanRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// DR Test resolvers

func (r *Resolver) RecordDrTest(ctx context.Context, planID string, input CreateDrTestInput) (*model.DrTest, error) {
	t := &model.DrTest{
		DrPlanID:     planID,
		TestType:     input.TestType,
		Result:       derefStr(input.Result),
		Observations: derefStr(input.Observations),
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.DrPlanRepo.CreateTest(ctx, tx, t)
	})
	return t, err
}

func (r *Resolver) UpdateDrTest(ctx context.Context, id string, input UpdateDrTestInput) (*model.DrTest, error) {
	t := &model.DrTest{ID: id}
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		if input.Result != nil {
			t.Result = *input.Result
		}
		if input.Observations != nil {
			t.Observations = *input.Observations
		}
		if input.TestType != nil {
			t.TestType = *input.TestType
		}
		return r.DrPlanRepo.UpdateTest(ctx, tx, t)
	})
	return t, err
}

func (r *Resolver) DrPlanTests(ctx context.Context, plan *model.DrPlan) ([]*model.DrTest, error) {
	var tests []*model.DrTest
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		tests, err = r.DrPlanRepo.ListTests(ctx, tx, plan.ID)
		return err
	})
	return tests, err
}

func (r *Resolver) DrPlanOwner(ctx context.Context, plan *model.DrPlan) (*model.User, error) {
	if plan.OwnerID == nil {
		return nil, nil
	}
	return r.resolveUser(ctx, *plan.OwnerID)
}

// Input types

type CreateDrPlanInput struct {
	Name       string  `json:"name"`
	Scope      *string `json:"scope"`
	OwnerID    *string `json:"ownerId"`
	Version    *string `json:"version"`
	RTOMinutes *int    `json:"rtoMinutes"`
	RPOMinutes *int    `json:"rpoMinutes"`
	Playbook   *string `json:"playbook"`
}

type UpdateDrPlanInput struct {
	Name       *string `json:"name"`
	Scope      *string `json:"scope"`
	OwnerID    *string `json:"ownerId"`
	Version    *string `json:"version"`
	RTOMinutes *int    `json:"rtoMinutes"`
	RPOMinutes *int    `json:"rpoMinutes"`
	Playbook   *string `json:"playbook"`
	Status     *string `json:"status"`
}

type CreateDrTestInput struct {
	TestType     string  `json:"testType"`
	Result       *string `json:"result"`
	Observations *string `json:"observations"`
}

type UpdateDrTestInput struct {
	TestType     *string `json:"testType"`
	Result       *string `json:"result"`
	Observations *string `json:"observations"`
}
