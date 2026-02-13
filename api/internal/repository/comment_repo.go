package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

type CommentRepo struct{}

func NewCommentRepo() *CommentRepo {
	return &CommentRepo{}
}

func (r *CommentRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.Comment, error) {
	c := &model.Comment{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, entity_type, entity_id, author_id, body, created_at, updated_at
		FROM comments WHERE id = $1
	`, id).Scan(&c.ID, &c.OrgID, &c.EntityType, &c.EntityID, &c.AuthorID, &c.Body, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get comment: %w", err)
	}
	return c, nil
}

func (r *CommentRepo) ListByEntity(ctx context.Context, tx pgx.Tx, entityType, entityID string, params PaginationParams) ([]*model.Comment, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	var totalCount int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM comments WHERE entity_type = $1 AND entity_id = $2`, entityType, entityID).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, org_id, entity_type, entity_id, author_id, body, created_at, updated_at
		FROM comments WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC LIMIT $3 OFFSET $4
	`, entityType, entityID, limit+1, offset)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var comments []*model.Comment
	for rows.Next() {
		c := &model.Comment{}
		if err := rows.Scan(&c.ID, &c.OrgID, &c.EntityType, &c.EntityID, &c.AuthorID, &c.Body, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, PaginationResult{}, err
		}
		comments = append(comments, c)
	}

	hasNext := len(comments) > limit
	if hasNext {
		comments = comments[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(comments) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(comments) - 1)
	}
	return comments, result, nil
}

func (r *CommentRepo) Create(ctx context.Context, tx pgx.Tx, c *model.Comment) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO comments (org_id, entity_type, entity_id, author_id, body)
		VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at
	`, c.OrgID, c.EntityType, c.EntityID, c.AuthorID, c.Body).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	return err
}

func (r *CommentRepo) Update(ctx context.Context, tx pgx.Tx, c *model.Comment) error {
	_, err := tx.Exec(ctx, `UPDATE comments SET body = $2, updated_at = now() WHERE id = $1`, c.ID, c.Body)
	return err
}

func (r *CommentRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM comments WHERE id = $1`, id)
	return err
}

// Evidence

type EvidenceRepo struct{}

func NewEvidenceRepo() *EvidenceRepo {
	return &EvidenceRepo{}
}

func (r *EvidenceRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.Evidence, error) {
	e := &model.Evidence{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, entity_type, entity_id, file_name, file_path,
		       file_size, content_type, uploaded_by, created_at
		FROM evidence WHERE id = $1
	`, id).Scan(&e.ID, &e.OrgID, &e.EntityType, &e.EntityID, &e.FileName, &e.FilePath,
		&e.FileSize, &e.ContentType, &e.UploadedBy, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get evidence: %w", err)
	}
	return e, nil
}

func (r *EvidenceRepo) ListByEntity(ctx context.Context, tx pgx.Tx, entityType, entityID string, params PaginationParams) ([]*model.Evidence, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	var totalCount int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM evidence WHERE entity_type = $1 AND entity_id = $2`, entityType, entityID).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, org_id, entity_type, entity_id, file_name, file_path,
		       file_size, content_type, uploaded_by, created_at
		FROM evidence WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC LIMIT $3 OFFSET $4
	`, entityType, entityID, limit+1, offset)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var items []*model.Evidence
	for rows.Next() {
		e := &model.Evidence{}
		if err := rows.Scan(&e.ID, &e.OrgID, &e.EntityType, &e.EntityID, &e.FileName, &e.FilePath,
			&e.FileSize, &e.ContentType, &e.UploadedBy, &e.CreatedAt); err != nil {
			return nil, PaginationResult{}, err
		}
		items = append(items, e)
	}

	hasNext := len(items) > limit
	if hasNext {
		items = items[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(items) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(items) - 1)
	}
	return items, result, nil
}

func (r *EvidenceRepo) Create(ctx context.Context, tx pgx.Tx, e *model.Evidence) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO evidence (org_id, entity_type, entity_id, file_name, file_path, file_size, content_type, uploaded_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at
	`, e.OrgID, e.EntityType, e.EntityID, e.FileName, e.FilePath, e.FileSize, e.ContentType, e.UploadedBy,
	).Scan(&e.ID, &e.CreatedAt)
	return err
}

func (r *EvidenceRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM evidence WHERE id = $1`, id)
	return err
}
