package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

// ---- Comment Resolvers ----

type CommentConnection struct {
	Edges      []*CommentEdge `json:"edges"`
	PageInfo   *PageInfo      `json:"pageInfo"`
	TotalCount int            `json:"totalCount"`
}

type CommentEdge struct {
	Cursor string         `json:"cursor"`
	Node   *model.Comment `json:"node"`
}

func (r *Resolver) EntityComments(ctx context.Context, entityType, entityID string, first *int, after *string) (*CommentConnection, error) {
	params := paginationParams(first, after)
	var comments []*model.Comment
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		comments, pr, err = r.CommentRepo.ListByEntity(ctx, tx, entityType, entityID, params)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*CommentEdge, len(comments))
	for i, c := range comments {
		edges[i] = &CommentEdge{Cursor: repository.EncodeCursor(i), Node: c}
	}
	return &CommentConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) AddComment(ctx context.Context, entityType, entityID, body string) (*model.Comment, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}
	orgID, ok := auth.OrgIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	c := &model.Comment{
		OrgID:      orgID,
		EntityType: entityType,
		EntityID:   entityID,
		AuthorID:   userID,
		Body:       body,
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.CommentRepo.Create(ctx, tx, c)
	})
	return c, err
}

func (r *Resolver) UpdateComment(ctx context.Context, id, body string) (*model.Comment, error) {
	var c *model.Comment
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		c, err = r.CommentRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		c.Body = body
		return r.CommentRepo.Update(ctx, tx, c)
	})
	return c, err
}

func (r *Resolver) DeleteComment(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.CommentRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// Comment field resolver: author

func (r *Resolver) CommentAuthor(ctx context.Context, c *model.Comment) (*model.User, error) {
	return r.resolveUser(ctx, c.AuthorID)
}

// ---- Evidence Resolvers ----

type EvidenceConnection struct {
	Edges      []*EvidenceEdge `json:"edges"`
	PageInfo   *PageInfo       `json:"pageInfo"`
	TotalCount int             `json:"totalCount"`
}

type EvidenceEdge struct {
	Cursor string          `json:"cursor"`
	Node   *model.Evidence `json:"node"`
}

func (r *Resolver) EntityEvidence(ctx context.Context, entityType, entityID string, first *int, after *string) (*EvidenceConnection, error) {
	params := paginationParams(first, after)
	var evidence []*model.Evidence
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		evidence, pr, err = r.EvidenceRepo.ListByEntity(ctx, tx, entityType, entityID, params)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*EvidenceEdge, len(evidence))
	for i, e := range evidence {
		edges[i] = &EvidenceEdge{Cursor: repository.EncodeCursor(i), Node: e}
	}
	return &EvidenceConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

func (r *Resolver) AddEvidence(ctx context.Context, entityType, entityID, fileName, filePath, contentType string, fileSize int64) (*model.Evidence, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}
	orgID, ok := auth.OrgIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	e := &model.Evidence{
		OrgID:       orgID,
		EntityType:  entityType,
		EntityID:    entityID,
		FileName:    fileName,
		FilePath:    filePath,
		FileSize:    fileSize,
		ContentType: contentType,
		UploadedBy:  userID,
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.EvidenceRepo.Create(ctx, tx, e)
	})
	return e, err
}

func (r *Resolver) DeleteEvidence(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.EvidenceRepo.Delete(ctx, tx, id)
	})
	return err == nil, err
}

// Evidence field resolver: uploadedBy

func (r *Resolver) EvidenceUploadedBy(ctx context.Context, e *model.Evidence) (*model.User, error) {
	return r.resolveUser(ctx, e.UploadedBy)
}
