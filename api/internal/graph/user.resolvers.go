package graph

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

// ---- User Query Resolvers ----

func (r *Resolver) Me(ctx context.Context) (*model.User, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	var user *model.User
	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, userID)
		return err
	})
	return user, err
}

type UserConnection struct {
	Edges      []*UserEdge `json:"edges"`
	PageInfo   *PageInfo   `json:"pageInfo"`
	TotalCount int         `json:"totalCount"`
}

type UserEdge struct {
	Cursor string      `json:"cursor"`
	Node   *model.User `json:"node"`
}

func (r *Resolver) Users(ctx context.Context, first *int, after *string, filter *repository.UserFilter) (*UserConnection, error) {
	params := paginationParams(first, after)

	var users []*model.User
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		users, pr, err = r.UserRepo.List(ctx, tx, params, filter)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*UserEdge, len(users))
	for i, u := range users {
		edges[i] = &UserEdge{
			Cursor: repository.EncodeCursor(i),
			Node:   u,
		}
	}

	return &UserConnection{
		Edges:      edges,
		PageInfo:   toPageInfo(pr),
		TotalCount: pr.TotalCount,
	}, nil
}

// ---- User Mutation Resolvers ----

func (r *Resolver) CreateUser(ctx context.Context, email, password, displayName string, jobTitle, department *string, groupIDs []string) (*model.User, error) {
	orgID, err := auth.OrgIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	hashed, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{
		OrgID:        orgID,
		Email:        email,
		PasswordHash: hashed,
		DisplayName:  displayName,
		Status:       "active",
	}
	if jobTitle != nil {
		user.JobTitle = *jobTitle
	}
	if department != nil {
		user.Department = *department
	}

	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		if err := r.UserRepo.Create(ctx, tx, user); err != nil {
			return err
		}
		for _, gid := range groupIDs {
			if err := r.UserRepo.AddUserToGroup(ctx, tx, user.ID, gid); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *Resolver) UpdateUser(ctx context.Context, id string, displayName, jobTitle, department, status *string) (*model.User, error) {
	var user *model.User
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if displayName != nil {
			user.DisplayName = *displayName
		}
		if jobTitle != nil {
			user.JobTitle = *jobTitle
		}
		if department != nil {
			user.Department = *department
		}
		if status != nil {
			user.Status = *status
		}
		return r.UserRepo.Update(ctx, tx, user)
	})
	return user, err
}

func (r *Resolver) DisableUser(ctx context.Context, id string) (*model.User, error) {
	disabled := "disabled"
	return r.UpdateUser(ctx, id, nil, nil, nil, &disabled)
}

func (r *Resolver) EnableUser(ctx context.Context, id string) (*model.User, error) {
	active := "active"
	return r.UpdateUser(ctx, id, nil, nil, nil, &active)
}

func (r *Resolver) ChangePassword(ctx context.Context, currentPassword, newPassword string) (bool, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("authentication required")
	}

	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		user, err := r.UserRepo.GetByID(ctx, tx, userID)
		if err != nil {
			return err
		}

		match, err := auth.ComparePassword(user.PasswordHash, currentPassword)
		if err != nil || !match {
			return fmt.Errorf("current password is incorrect")
		}

		hashed, err := auth.HashPassword(newPassword)
		if err != nil {
			return err
		}

		if err := r.UserRepo.UpdatePassword(ctx, tx, userID, hashed); err != nil {
			return err
		}

		// Revoke all refresh tokens on password change
		return r.UserRepo.RevokeAllUserRefreshTokens(ctx, tx, userID)
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *Resolver) UpdateProfile(ctx context.Context, displayName, jobTitle, department, profilePictureURL *string) (*model.User, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	var user *model.User
	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		user, err = r.UserRepo.GetByID(ctx, tx, userID)
		if err != nil {
			return err
		}
		if displayName != nil {
			user.DisplayName = *displayName
		}
		if jobTitle != nil {
			user.JobTitle = *jobTitle
		}
		if department != nil {
			user.Department = *department
		}
		if profilePictureURL != nil {
			user.ProfilePictureURL = *profilePictureURL
		}
		return r.UserRepo.Update(ctx, tx, user)
	})
	return user, err
}

// ---- Group Resolvers ----

type GroupConnection struct {
	Edges      []*GroupEdge  `json:"edges"`
	PageInfo   *PageInfo     `json:"pageInfo"`
	TotalCount int           `json:"totalCount"`
}

type GroupEdge struct {
	Cursor string       `json:"cursor"`
	Node   *model.Group `json:"node"`
}

func (r *Resolver) Groups(ctx context.Context, first *int, after *string) (*GroupConnection, error) {
	params := paginationParams(first, after)

	var groups []*model.Group
	var pr repository.PaginationResult

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		groups, pr, err = r.UserRepo.ListGroups(ctx, tx, params)
		return err
	})
	if err != nil {
		return nil, err
	}

	edges := make([]*GroupEdge, len(groups))
	for i, g := range groups {
		edges[i] = &GroupEdge{
			Cursor: repository.EncodeCursor(i),
			Node:   g,
		}
	}

	return &GroupConnection{
		Edges:      edges,
		PageInfo:   toPageInfo(pr),
		TotalCount: pr.TotalCount,
	}, nil
}

func (r *Resolver) CreateGroup(ctx context.Context, name string, description *string, permissions []string) (*model.Group, error) {
	orgID, err := auth.OrgIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required")
	}

	g := &model.Group{
		OrgID:       orgID,
		Name:        name,
		Permissions: permissions,
	}
	if description != nil {
		g.Description = *description
	}

	err = r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.UserRepo.CreateGroup(ctx, tx, g)
	})
	return g, err
}

func (r *Resolver) UpdateGroup(ctx context.Context, id string, name, description *string, permissions []string) (*model.Group, error) {
	var g *model.Group
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		g, err = r.UserRepo.GetGroupByID(ctx, tx, id)
		if err != nil {
			return err
		}
		if name != nil {
			g.Name = *name
		}
		if description != nil {
			g.Description = *description
		}
		if permissions != nil {
			g.Permissions = permissions
		}
		return r.UserRepo.UpdateGroup(ctx, tx, g)
	})
	return g, err
}

func (r *Resolver) DeleteGroup(ctx context.Context, id string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.UserRepo.DeleteGroup(ctx, tx, id)
	})
	return err == nil, err
}

func (r *Resolver) AddUserToGroup(ctx context.Context, userID, groupID string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.UserRepo.AddUserToGroup(ctx, tx, userID, groupID)
	})
	return err == nil, err
}

func (r *Resolver) RemoveUserFromGroup(ctx context.Context, userID, groupID string) (bool, error) {
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		return r.UserRepo.RemoveUserFromGroup(ctx, tx, userID, groupID)
	})
	return err == nil, err
}

// ---- User field resolvers ----

func (r *Resolver) UserGroups(ctx context.Context, user *model.User, first *int, after *string) (*GroupConnection, error) {
	params := paginationParams(first, after)

	var groups []*model.Group
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		var err error
		groups, err = r.UserRepo.GetUserGroups(ctx, tx, user.ID)
		return err
	})
	if err != nil {
		return nil, err
	}

	// Simple conversion (no pagination needed for user's groups typically)
	edges := make([]*GroupEdge, len(groups))
	for i, g := range groups {
		edges[i] = &GroupEdge{
			Cursor: repository.EncodeCursor(i),
			Node:   g,
		}
	}

	pi := &PageInfo{HasNextPage: false, HasPreviousPage: false}
	_ = params // satisfy usage
	return &GroupConnection{
		Edges:      edges,
		PageInfo:   pi,
		TotalCount: len(groups),
	}, nil
}
