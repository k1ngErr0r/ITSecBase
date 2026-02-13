package graph

// This file will be replaced by gqlgen generate output.
// For now, it defines the resolver method signatures that match the GraphQL schema.
// After running `gqlgen generate`, this file will contain the generated interfaces
// and the resolver methods below will be split into per-schema files.

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/model"
	"github.com/jmcintyre/secbase/api/internal/repository"
)

// ---- Query Resolvers ----

func (r *Resolver) Health(ctx context.Context) (bool, error) {
	return true, nil
}

func (r *Resolver) Node(ctx context.Context, id string) (interface{}, error) {
	// Relay node refetch — decode the ID to determine the type
	// IDs are plain UUIDs; the resolver tries each entity type
	// In production, use a base64-encoded "Type:UUID" format
	return nil, fmt.Errorf("node lookup not yet implemented for id: %s", id)
}

// ---- Auth Mutation Resolvers ----

type AuthPayload struct {
	AccessToken  string      `json:"accessToken"`
	RefreshToken string      `json:"refreshToken"`
	User         *model.User `json:"user"`
}

type TotpSetupPayload struct {
	Secret          string   `json:"secret"`
	ProvisioningURL string   `json:"provisioningUrl"`
	BackupCodes     []string `json:"backupCodes"`
}

type TotpVerifyPayload struct {
	Success bool `json:"success"`
}

func (r *Resolver) Login(ctx context.Context, email, password string, totpCode *string) (*AuthPayload, error) {
	var result *AuthPayload

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		user, err := r.UserRepo.GetByEmail(ctx, tx, email)
		if err != nil {
			return fmt.Errorf("invalid email or password")
		}

		if user.Status != "active" {
			return fmt.Errorf("account is disabled")
		}

		match, err := auth.ComparePassword(user.PasswordHash, password)
		if err != nil || !match {
			_ = r.UserRepo.IncrementFailedLogin(ctx, tx, user.ID)
			return fmt.Errorf("invalid email or password")
		}

		if user.TOTPEnabled {
			if totpCode == nil {
				return fmt.Errorf("totp_required")
			}
			if !auth.ValidateTOTP(user.TOTPSecret, *totpCode) {
				return fmt.Errorf("invalid TOTP code")
			}
		}

		// Get user's roles from groups
		groups, err := r.UserRepo.GetUserGroups(ctx, tx, user.ID)
		if err != nil {
			return fmt.Errorf("get user groups: %w", err)
		}
		var roles []string
		for _, g := range groups {
			roles = append(roles, g.Name)
		}

		accessToken, err := auth.GenerateAccessToken(
			user.ID, user.OrgID, user.Email, roles,
			r.Config.JWT.Secret, r.Config.JWT.AccessExpiry,
		)
		if err != nil {
			return fmt.Errorf("generate access token: %w", err)
		}

		plainRefresh, hashedRefresh, err := auth.GenerateRefreshToken()
		if err != nil {
			return fmt.Errorf("generate refresh token: %w", err)
		}

		refreshToken := &model.RefreshToken{
			ID:        uuid.New().String(),
			UserID:    user.ID,
			TokenHash: hashedRefresh,
			ExpiresAt: time.Now().Add(r.Config.JWT.RefreshExpiry),
		}
		if err := r.UserRepo.StoreRefreshToken(ctx, tx, refreshToken); err != nil {
			return fmt.Errorf("store refresh token: %w", err)
		}

		_ = r.UserRepo.UpdateLastLogin(ctx, tx, user.ID)

		result = &AuthPayload{
			AccessToken:  accessToken,
			RefreshToken: plainRefresh,
			User:         user,
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *Resolver) RefreshToken(ctx context.Context, token string) (*AuthPayload, error) {
	var result *AuthPayload

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		hashed := auth.HashRefreshToken(token)
		rt, err := r.UserRepo.GetRefreshTokenByHash(ctx, tx, hashed)
		if err != nil {
			return fmt.Errorf("invalid refresh token")
		}

		if time.Now().After(rt.ExpiresAt) {
			return fmt.Errorf("refresh token expired")
		}

		// Revoke old token
		if err := r.UserRepo.RevokeRefreshToken(ctx, tx, rt.ID); err != nil {
			return err
		}

		user, err := r.UserRepo.GetByID(ctx, tx, rt.UserID)
		if err != nil {
			return err
		}
		if user.Status != "active" {
			return fmt.Errorf("account is disabled")
		}

		groups, err := r.UserRepo.GetUserGroups(ctx, tx, user.ID)
		if err != nil {
			return err
		}
		var roles []string
		for _, g := range groups {
			roles = append(roles, g.Name)
		}

		accessToken, err := auth.GenerateAccessToken(
			user.ID, user.OrgID, user.Email, roles,
			r.Config.JWT.Secret, r.Config.JWT.AccessExpiry,
		)
		if err != nil {
			return err
		}

		plainRefresh, hashedRefresh, err := auth.GenerateRefreshToken()
		if err != nil {
			return err
		}

		newRT := &model.RefreshToken{
			ID:        uuid.New().String(),
			UserID:    user.ID,
			TokenHash: hashedRefresh,
			ExpiresAt: time.Now().Add(r.Config.JWT.RefreshExpiry),
		}
		if err := r.UserRepo.StoreRefreshToken(ctx, tx, newRT); err != nil {
			return err
		}

		result = &AuthPayload{
			AccessToken:  accessToken,
			RefreshToken: plainRefresh,
			User:         user,
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *Resolver) SetupTotp(ctx context.Context) (*TotpSetupPayload, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	var result *TotpSetupPayload
	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		user, err := r.UserRepo.GetByID(ctx, tx, userID)
		if err != nil {
			return err
		}

		key, err := auth.GenerateTOTPSecret(user.Email)
		if err != nil {
			return err
		}

		backupCodes := auth.GenerateBackupCodes(8)

		// Store the secret (not yet enabled until verified)
		if err := r.UserRepo.UpdateTOTP(ctx, tx, user.ID, key.Secret(), false); err != nil {
			return err
		}

		result = &TotpSetupPayload{
			Secret:          key.Secret(),
			ProvisioningURL: key.URL(),
			BackupCodes:     backupCodes,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *Resolver) VerifyTotp(ctx context.Context, code string) (*TotpVerifyPayload, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("authentication required")
	}

	err := r.DB.WithTx(ctx, func(tx pgx.Tx) error {
		user, err := r.UserRepo.GetByID(ctx, tx, userID)
		if err != nil {
			return err
		}

		if !auth.ValidateTOTP(user.TOTPSecret, code) {
			return fmt.Errorf("invalid TOTP code")
		}

		return r.UserRepo.UpdateTOTP(ctx, tx, user.ID, user.TOTPSecret, true)
	})
	if err != nil {
		return nil, err
	}
	return &TotpVerifyPayload{Success: true}, nil
}

// ---- Helper for pagination conversion ----

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

func toPageInfo(pr repository.PaginationResult) *PageInfo {
	return &PageInfo{
		HasNextPage:     pr.HasNextPage,
		HasPreviousPage: pr.HasPreviousPage,
		StartCursor:     strPtr(pr.StartCursor),
		EndCursor:       strPtr(pr.EndCursor),
	}
}

type PageInfo struct {
	HasNextPage     bool    `json:"hasNextPage"`
	HasPreviousPage bool    `json:"hasPreviousPage"`
	StartCursor     *string `json:"startCursor"`
	EndCursor       *string `json:"endCursor"`
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
