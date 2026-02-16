package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

type AssetRepo struct{}

func NewAssetRepo() *AssetRepo {
	return &AssetRepo{}
}

func (r *AssetRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.Asset, error) {
	a := &model.Asset{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, name, asset_type, make, model, version,
		       business_owner_id, technical_owner_id, ip_addresses, hostnames,
		       fqdn, url, location_site, location_detail, environment,
		       criticality, data_classification, tags, status,
		       decommission_date, created_at, updated_at
		FROM assets WHERE id = $1
	`, id).Scan(
		&a.ID, &a.OrgID, &a.Name, &a.AssetType, &a.Make, &a.Model, &a.Version,
		&a.BusinessOwnerID, &a.TechnicalOwnerID, &a.IPAddresses, &a.Hostnames,
		&a.FQDN, &a.URL, &a.LocationSite, &a.LocationDetail, &a.Environment,
		&a.Criticality, &a.DataClassification, &a.Tags, &a.Status,
		&a.DecommissionDate, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get asset: %w", err)
	}
	return a, nil
}

func (r *AssetRepo) List(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *AssetFilter) ([]*model.Asset, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if filter != nil {
		if filter.AssetType != nil {
			where += fmt.Sprintf(" AND asset_type = $%d", argIdx)
			args = append(args, *filter.AssetType)
			argIdx++
		}
		if filter.Environment != nil {
			where += fmt.Sprintf(" AND environment = $%d", argIdx)
			args = append(args, *filter.Environment)
			argIdx++
		}
		if filter.Criticality != nil {
			where += fmt.Sprintf(" AND criticality = $%d", argIdx)
			args = append(args, *filter.Criticality)
			argIdx++
		}
		if filter.Status != nil {
			where += fmt.Sprintf(" AND status = $%d", argIdx)
			args = append(args, *filter.Status)
			argIdx++
		}
		if filter.OwnerID != nil {
			where += fmt.Sprintf(" AND (business_owner_id = $%d OR technical_owner_id = $%d)", argIdx, argIdx)
			args = append(args, *filter.OwnerID)
			argIdx++
		}
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (name ILIKE $%d OR fqdn ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
	}

	var totalCount int
	if err := tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM assets %s", where), args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, fmt.Errorf("count assets: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, org_id, name, asset_type, make, model, version,
		       business_owner_id, technical_owner_id, ip_addresses, hostnames,
		       fqdn, url, location_site, location_detail, environment,
		       criticality, data_classification, tags, status,
		       decommission_date, created_at, updated_at
		FROM assets %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, fmt.Errorf("list assets: %w", err)
	}
	defer rows.Close()

	var assets []*model.Asset
	for rows.Next() {
		a := &model.Asset{}
		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.Name, &a.AssetType, &a.Make, &a.Model, &a.Version,
			&a.BusinessOwnerID, &a.TechnicalOwnerID, &a.IPAddresses, &a.Hostnames,
			&a.FQDN, &a.URL, &a.LocationSite, &a.LocationDetail, &a.Environment,
			&a.Criticality, &a.DataClassification, &a.Tags, &a.Status,
			&a.DecommissionDate, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, fmt.Errorf("scan asset: %w", err)
		}
		assets = append(assets, a)
	}

	hasNext := len(assets) > limit
	if hasNext {
		assets = assets[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(assets) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(assets) - 1)
	}

	return assets, result, nil
}

func (r *AssetRepo) Create(ctx context.Context, tx pgx.Tx, a *model.Asset) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO assets (
			org_id, name, asset_type, make, model, version,
			business_owner_id, technical_owner_id, ip_addresses, hostnames,
			fqdn, url, location_site, location_detail, environment,
			criticality, data_classification, tags, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING id, created_at, updated_at
	`, a.OrgID, a.Name, a.AssetType, a.Make, a.Model, a.Version,
		a.BusinessOwnerID, a.TechnicalOwnerID, a.IPAddresses, a.Hostnames,
		a.FQDN, a.URL, a.LocationSite, a.LocationDetail, a.Environment,
		a.Criticality, a.DataClassification, a.Tags, a.Status,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create asset: %w", err)
	}
	return nil
}

func (r *AssetRepo) Update(ctx context.Context, tx pgx.Tx, a *model.Asset) error {
	_, err := tx.Exec(ctx, `
		UPDATE assets SET
			name=$2, asset_type=$3, make=$4, model=$5, version=$6,
			business_owner_id=$7, technical_owner_id=$8, ip_addresses=$9, hostnames=$10,
			fqdn=$11, url=$12, location_site=$13, location_detail=$14, environment=$15,
			criticality=$16, data_classification=$17, tags=$18, status=$19, updated_at=now()
		WHERE id = $1
	`, a.ID, a.Name, a.AssetType, a.Make, a.Model, a.Version,
		a.BusinessOwnerID, a.TechnicalOwnerID, a.IPAddresses, a.Hostnames,
		a.FQDN, a.URL, a.LocationSite, a.LocationDetail, a.Environment,
		a.Criticality, a.DataClassification, a.Tags, a.Status,
	)
	if err != nil {
		return fmt.Errorf("update asset: %w", err)
	}
	return nil
}

func (r *AssetRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM assets WHERE id = $1`, id)
	return err
}

func (r *AssetRepo) GetDependencies(ctx context.Context, tx pgx.Tx, assetID string) ([]*model.Asset, error) {
	rows, err := tx.Query(ctx, `
		SELECT a.id, a.org_id, a.name, a.asset_type, a.make, a.model, a.version,
		       a.business_owner_id, a.technical_owner_id, a.ip_addresses, a.hostnames,
		       a.fqdn, a.url, a.location_site, a.location_detail, a.environment,
		       a.criticality, a.data_classification, a.tags, a.status,
		       a.decommission_date, a.created_at, a.updated_at
		FROM assets a JOIN asset_dependencies ad ON a.id = ad.depends_on_id
		WHERE ad.asset_id = $1
	`, assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*model.Asset
	for rows.Next() {
		a := &model.Asset{}
		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.Name, &a.AssetType, &a.Make, &a.Model, &a.Version,
			&a.BusinessOwnerID, &a.TechnicalOwnerID, &a.IPAddresses, &a.Hostnames,
			&a.FQDN, &a.URL, &a.LocationSite, &a.LocationDetail, &a.Environment,
			&a.Criticality, &a.DataClassification, &a.Tags, &a.Status,
			&a.DecommissionDate, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	return assets, nil
}

type AssetFilter struct {
	AssetType   *string
	Environment *string
	Criticality *int
	Status      *string
	OwnerID     *string
	Search      *string
	Tags        []string
}
