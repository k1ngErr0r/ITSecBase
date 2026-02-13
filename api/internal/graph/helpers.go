package graph

import (
	"context"
	"encoding/json"

	pgx "github.com/jackc/pgx/v5"
	model1 "github.com/jmcintyre/secbase/api/internal/graph/model"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

func paginationParams(first *int, after *string) repository.PaginationParams {
	p := repository.PaginationParams{}
	if first != nil {
		p.First = *first
	}
	if after != nil {
		p.After = *after
	}
	return p
}

func toPageInfo(pr repository.PaginationResult) *model1.PageInfo {
	return &model1.PageInfo{
		HasNextPage:     pr.HasNextPage,
		HasPreviousPage: pr.HasPreviousPage,
		StartCursor:     strPtr(pr.StartCursor),
		EndCursor:       strPtr(pr.EndCursor),
	}
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

func jsonToStrings(raw json.RawMessage) ([]string, error) {
	if raw == nil {
		return nil, nil
	}
	var result []string
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// resolveUser fetches a user by ID.
func (r *Resolver) resolveUser(ctx context.Context, id string) (*model.User, error) {
	var user *model.User
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, id)
		return err
	})
	return user, err
}

// entityComments returns a paginated comment connection for any entity.
func (r *Resolver) entityComments(ctx context.Context, entityType, entityID string, first *int, after *string) (*model1.CommentConnection, error) {
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

	edges := make([]*model1.CommentEdge, len(comments))
	for i, c := range comments {
		edges[i] = &model1.CommentEdge{Cursor: repository.EncodeCursor(i), Node: c}
	}
	return &model1.CommentConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}

// entityEvidence returns a paginated evidence connection for any entity.
func (r *Resolver) entityEvidence(ctx context.Context, entityType, entityID string, first *int, after *string) (*model1.EvidenceConnection, error) {
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

	edges := make([]*model1.EvidenceEdge, len(evidence))
	for i, e := range evidence {
		edges[i] = &model1.EvidenceEdge{Cursor: repository.EncodeCursor(i), Node: e}
	}
	return &model1.EvidenceConnection{Edges: edges, PageInfo: toPageInfo(pr), TotalCount: pr.TotalCount}, nil
}
