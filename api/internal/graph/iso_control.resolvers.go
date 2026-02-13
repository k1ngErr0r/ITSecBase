package graph

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

func (r *Resolver) IsoControls(ctx context.Context, theme *string) ([]*model.IsoControl, error) {
	var controls []*model.IsoControl
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		controls, err = r.IsoControlRepo.ListControls(ctx, tx, theme)
		return err
	})
	return controls, err
}

func (r *Resolver) IsoControl(ctx context.Context, id string) (*model.IsoControl, error) {
	var c *model.IsoControl
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		c, err = r.IsoControlRepo.GetByID(ctx, tx, id)
		return err
	})
	return c, err
}

type OrgIsoControlConnection struct {
	Edges      []*OrgIsoControlEdge `json:"edges"`
	PageInfo   *PageInfo            `json:"pageInfo"`
	TotalCount int                  `json:"totalCount"`
}

type OrgIsoControlEdge struct {
	Cursor string               `json:"cursor"`
	Node   *model.OrgIsoControl `json:"node"`
}

func (r *Resolver) OrgIsoControls(ctx context.Context, first *int, after *string, filter *repository.IsoFilter) (*OrgIsoControlConnection, error) {
	params := paginationParams(first, after)
	var controls []*model.OrgIsoControl
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		controls, pr, err = r.IsoControlRepo.ListOrgControls(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*OrgIsoControlEdge, len(controls))
	for i, c := range controls {
		edges[i] = &OrgIsoControlEdge{Cursor: repository.EncodeCursor(i), Node: c}
	}
	return &OrgIsoControlConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) UpdateOrgIsoControl(ctx context.Context, input UpdateOrgIsoControlInput) (*model.OrgIsoControl, error) {
	oc := &model.OrgIsoControl{
		IsoControlID: input.IsoControlID,
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		// Try to get existing
		existing, err := r.IsoControlRepo.GetOrgControlByIsoControlID(ctx, tx, input.IsoControlID)
		if err == nil {
			oc = existing
		}

		if input.Applicability != nil {
			oc.Applicability = *input.Applicability
		}
		if input.NonApplicabilityJustification != nil {
			oc.NonApplicabilityJustification = *input.NonApplicabilityJustification
		}
		if input.ImplementationStatus != nil {
			oc.ImplementationStatus = *input.ImplementationStatus
		}
		if input.ImplementationDescription != nil {
			oc.ImplementationDescription = *input.ImplementationDescription
		}
		if input.ResponsibleOwnerID != nil {
			oc.ResponsibleOwnerID = input.ResponsibleOwnerID
		}

		return r.IsoControlRepo.UpsertOrgControl(ctx, tx, oc)
	})

	return oc, err
}

// Field resolver: OrgIsoControl -> IsoControl (reference)
func (r *Resolver) OrgIsoControlRef(ctx context.Context, oc *model.OrgIsoControl) (*model.IsoControl, error) {
	var c *model.IsoControl
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		c, err = r.IsoControlRepo.GetByID(ctx, tx, oc.IsoControlID)
		return err
	})
	return c, err
}

// ComplianceSnapshot for dashboard
func (r *Resolver) ComplianceSnapshot(ctx context.Context) (*repository.ComplianceSummary, error) {
	var s *repository.ComplianceSummary
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		s, err = r.IsoControlRepo.GetComplianceSummary(ctx, tx)
		return err
	})
	return s, err
}

// Input types

type UpdateOrgIsoControlInput struct {
	IsoControlID                  string  `json:"isoControlId"`
	Applicability                 *string `json:"applicability"`
	NonApplicabilityJustification *string `json:"nonApplicabilityJustification"`
	ImplementationStatus          *string `json:"implementationStatus"`
	ImplementationDescription     *string `json:"implementationDescription"`
	ResponsibleOwnerID            *string `json:"responsibleOwnerId"`
}
