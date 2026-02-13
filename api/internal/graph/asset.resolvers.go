package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

// ---- Asset Query Resolvers ----

type AssetConnection struct {
	Edges      []*AssetEdge `json:"edges"`
	PageInfo   *PageInfo    `json:"pageInfo"`
	TotalCount int          `json:"totalCount"`
}

type AssetEdge struct {
	Cursor string       `json:"cursor"`
	Node   *model.Asset `json:"node"`
}

func (r *Resolver) Assets(ctx context.Context, first *int, after *string, filter *repository.AssetFilter) (*AssetConnection, error) {
	params := paginationParams(first, after)

	var assets []*model.Asset
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		assets, pr, err = r.AssetRepo.List(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*AssetEdge, len(assets))
	for i, a := range assets {
		edges[i] = &AssetEdge{
			Cursor: repository.EncodeCursor(i),
			Node:   a,
		}
	}

	return &AssetConnection{
		Edges:      edges,
		PageInfo:   toPageInfo(pr),
		TotalCount: pr.TotalCount,
	}, nil
}

func (r *Resolver) Asset(ctx context.Context, id string) (*model.Asset, error) {
	var asset *model.Asset
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		asset, err = r.AssetRepo.GetByID(ctx, tx, id)
		return err
	})
	return asset, err
}

// ---- Asset Mutation Resolvers ----

func (r *Resolver) CreateAsset(ctx context.Context, input CreateAssetInput) (*model.Asset, error) {
	orgID, err := auth.OrgIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	a := &model.Asset{
		OrgID:     orgID,
		Name:      input.Name,
		AssetType: input.AssetType,
		Status:    "in_use",
	}

	if input.Make != nil {
		a.Make = *input.Make
	}
	if input.Model != nil {
		a.Model = *input.Model
	}
	if input.Version != nil {
		a.Version = *input.Version
	}
	a.BusinessOwnerID = input.BusinessOwnerID
	a.TechnicalOwnerID = input.TechnicalOwnerID
	if input.IPAddresses != nil {
		a.IPAddresses = input.IPAddresses
	}
	if input.Hostnames != nil {
		a.Hostnames = input.Hostnames
	}
	if input.FQDN != nil {
		a.FQDN = *input.FQDN
	}
	if input.URL != nil {
		a.URL = *input.URL
	}
	if input.LocationSite != nil {
		a.LocationSite = *input.LocationSite
	}
	if input.LocationDetail != nil {
		a.LocationDetail = *input.LocationDetail
	}
	if input.Environment != nil {
		a.Environment = *input.Environment
	}
	if input.Criticality != nil {
		a.Criticality = *input.Criticality
	}
	if input.DataClassification != nil {
		a.DataClassification = *input.DataClassification
	}
	if input.Tags != nil {
		a.Tags = input.Tags
	}

	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.AssetRepo.Create(ctx, tx, a)
	})
	return a, err
}

func (r *Resolver) UpdateAsset(ctx context.Context, id string, input UpdateAssetInput) (*model.Asset, error) {
	var a *model.Asset
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		a, err = r.AssetRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if input.Name != nil {
			a.Name = *input.Name
		}
		if input.AssetType != nil {
			a.AssetType = *input.AssetType
		}
		if input.Make != nil {
			a.Make = *input.Make
		}
		if input.Model != nil {
			a.Model = *input.Model
		}
		if input.Version != nil {
			a.Version = *input.Version
		}
		if input.BusinessOwnerID != nil {
			a.BusinessOwnerID = input.BusinessOwnerID
		}
		if input.TechnicalOwnerID != nil {
			a.TechnicalOwnerID = input.TechnicalOwnerID
		}
		if input.IPAddresses != nil {
			a.IPAddresses = input.IPAddresses
		}
		if input.Hostnames != nil {
			a.Hostnames = input.Hostnames
		}
		if input.FQDN != nil {
			a.FQDN = *input.FQDN
		}
		if input.URL != nil {
			a.URL = *input.URL
		}
		if input.LocationSite != nil {
			a.LocationSite = *input.LocationSite
		}
		if input.LocationDetail != nil {
			a.LocationDetail = *input.LocationDetail
		}
		if input.Environment != nil {
			a.Environment = *input.Environment
		}
		if input.Criticality != nil {
			a.Criticality = *input.Criticality
		}
		if input.DataClassification != nil {
			a.DataClassification = *input.DataClassification
		}
		if input.Tags != nil {
			a.Tags = input.Tags
		}
		if input.Status != nil {
			a.Status = *input.Status
		}
		return r.AssetRepo.Update(ctx, tx, a)
	})
	return a, err
}

func (r *Resolver) DeleteAsset(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.AssetRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// ---- Asset field resolvers ----

func (r *Resolver) AssetBusinessOwner(ctx context.Context, asset *model.Asset) (*model.User, error) {
	if asset.BusinessOwnerID == nil {
		return nil, nil
	}
	var user *model.User
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, *asset.BusinessOwnerID)
		return err
	})
	return user, err
}

func (r *Resolver) AssetTechnicalOwner(ctx context.Context, asset *model.Asset) (*model.User, error) {
	if asset.TechnicalOwnerID == nil {
		return nil, nil
	}
	var user *model.User
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, *asset.TechnicalOwnerID)
		return err
	})
	return user, err
}

func (r *Resolver) AssetDependencies(ctx context.Context, asset *model.Asset) ([]*model.Asset, error) {
	var deps []*model.Asset
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		deps, err = r.AssetRepo.GetDependencies(ctx, tx, asset.ID)
		return err
	})
	return deps, err
}

// ---- Input types ----

type CreateAssetInput struct {
	Name               string   `json:"name"`
	AssetType          string   `json:"assetType"`
	Make               *string  `json:"make"`
	Model              *string  `json:"model"`
	Version            *string  `json:"version"`
	BusinessOwnerID    *string  `json:"businessOwnerId"`
	TechnicalOwnerID   *string  `json:"technicalOwnerId"`
	IPAddresses        []string `json:"ipAddresses"`
	Hostnames          []string `json:"hostnames"`
	FQDN               *string  `json:"fqdn"`
	URL                *string  `json:"url"`
	LocationSite       *string  `json:"locationSite"`
	LocationDetail     *string  `json:"locationDetail"`
	Environment        *string  `json:"environment"`
	Criticality        *int     `json:"criticality"`
	DataClassification *string  `json:"dataClassification"`
	Tags               []string `json:"tags"`
}

type UpdateAssetInput struct {
	Name               *string  `json:"name"`
	AssetType          *string  `json:"assetType"`
	Make               *string  `json:"make"`
	Model              *string  `json:"model"`
	Version            *string  `json:"version"`
	BusinessOwnerID    *string  `json:"businessOwnerId"`
	TechnicalOwnerID   *string  `json:"technicalOwnerId"`
	IPAddresses        []string `json:"ipAddresses"`
	Hostnames          []string `json:"hostnames"`
	FQDN               *string  `json:"fqdn"`
	URL                *string  `json:"url"`
	LocationSite       *string  `json:"locationSite"`
	LocationDetail     *string  `json:"locationDetail"`
	Environment        *string  `json:"environment"`
	Criticality        *int     `json:"criticality"`
	DataClassification *string  `json:"dataClassification"`
	Tags               []string `json:"tags"`
	Status             *string  `json:"status"`
}
