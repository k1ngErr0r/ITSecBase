package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

type UserRepo struct{}

func NewUserRepo() *UserRepo {
	return &UserRepo{}
}

func (r *UserRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.User, error) {
	u := &model.User{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, email, password_hash, display_name, job_title, department,
		       profile_picture_url, status, totp_secret, totp_enabled, last_login_at,
		       failed_login_count, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(
		&u.ID, &u.OrgID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.JobTitle,
		&u.Department, &u.ProfilePictureURL, &u.Status, &u.TOTPSecret, &u.TOTPEnabled,
		&u.LastLoginAt, &u.FailedLoginCount, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, tx pgx.Tx, email string) (*model.User, error) {
	u := &model.User{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, email, password_hash, display_name, job_title, department,
		       profile_picture_url, status, totp_secret, totp_enabled, last_login_at,
		       failed_login_count, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(
		&u.ID, &u.OrgID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.JobTitle,
		&u.Department, &u.ProfilePictureURL, &u.Status, &u.TOTPSecret, &u.TOTPEnabled,
		&u.LastLoginAt, &u.FailedLoginCount, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

func (r *UserRepo) List(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *UserFilter) ([]*model.User, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	where := "WHERE org_id = current_setting('app.current_org_id', true)::uuid"
	args := []any{}
	argIdx := 1

	if filter != nil {
		if filter.Status != nil {
			where += fmt.Sprintf(" AND status = $%d", argIdx)
			args = append(args, *filter.Status)
			argIdx++
		}
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (display_name ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
		if filter.GroupID != nil {
			where += fmt.Sprintf(" AND id IN (SELECT user_id FROM user_groups WHERE group_id = $%d)", argIdx)
			args = append(args, *filter.GroupID)
			argIdx++
		}
	}

	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", where)
	if err := tx.QueryRow(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, fmt.Errorf("count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, org_id, email, password_hash, display_name, job_title, department,
		       profile_picture_url, status, totp_secret, totp_enabled, last_login_at,
		       failed_login_count, created_at, updated_at
		FROM users %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.OrgID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.JobTitle,
			&u.Department, &u.ProfilePictureURL, &u.Status, &u.TOTPSecret, &u.TOTPEnabled,
			&u.LastLoginAt, &u.FailedLoginCount, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	hasNext := len(users) > limit
	if hasNext {
		users = users[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(users) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(users) - 1)
	}

	return users, result, nil
}

func (r *UserRepo) Create(ctx context.Context, tx pgx.Tx, u *model.User) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO users (org_id, email, password_hash, display_name, job_title, department, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`, u.OrgID, u.Email, u.PasswordHash, u.DisplayName, u.JobTitle, u.Department, u.Status,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *UserRepo) Update(ctx context.Context, tx pgx.Tx, u *model.User) error {
	_, err := tx.Exec(ctx, `
		UPDATE users SET display_name = $2, job_title = $3, department = $4,
		       profile_picture_url = $5, status = $6, updated_at = now()
		WHERE id = $1
	`, u.ID, u.DisplayName, u.JobTitle, u.Department, u.ProfilePictureURL, u.Status)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

func (r *UserRepo) UpdatePassword(ctx context.Context, tx pgx.Tx, id, hash string) error {
	_, err := tx.Exec(ctx, `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, id, hash)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (r *UserRepo) UpdateTOTP(ctx context.Context, tx pgx.Tx, id, secret string, enabled bool) error {
	_, err := tx.Exec(ctx, `UPDATE users SET totp_secret = $2, totp_enabled = $3, updated_at = now() WHERE id = $1`, id, secret, enabled)
	if err != nil {
		return fmt.Errorf("update totp: %w", err)
	}
	return nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `UPDATE users SET last_login_at = now(), failed_login_count = 0 WHERE id = $1`, id)
	return err
}

func (r *UserRepo) IncrementFailedLogin(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = $1`, id)
	return err
}

// Group operations

func (r *UserRepo) GetGroupByID(ctx context.Context, tx pgx.Tx, id string) (*model.Group, error) {
	g := &model.Group{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, name, description, permissions, created_at
		FROM groups WHERE id = $1
	`, id).Scan(&g.ID, &g.OrgID, &g.Name, &g.Description, &g.Permissions, &g.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get group by id: %w", err)
	}
	return g, nil
}

func (r *UserRepo) ListGroups(ctx context.Context, tx pgx.Tx, params PaginationParams) ([]*model.Group, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	var totalCount int
	if err := tx.QueryRow(ctx, "SELECT COUNT(*) FROM groups").Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, org_id, name, description, permissions, created_at
		FROM groups ORDER BY name LIMIT $1 OFFSET $2
	`, limit+1, offset)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var groups []*model.Group
	for rows.Next() {
		g := &model.Group{}
		if err := rows.Scan(&g.ID, &g.OrgID, &g.Name, &g.Description, &g.Permissions, &g.CreatedAt); err != nil {
			return nil, PaginationResult{}, err
		}
		groups = append(groups, g)
	}

	hasNext := len(groups) > limit
	if hasNext {
		groups = groups[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(groups) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(groups) - 1)
	}

	return groups, result, nil
}

func (r *UserRepo) CreateGroup(ctx context.Context, tx pgx.Tx, g *model.Group) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO groups (org_id, name, description, permissions)
		VALUES ($1, $2, $3, $4) RETURNING id, created_at
	`, g.OrgID, g.Name, g.Description, g.Permissions).Scan(&g.ID, &g.CreatedAt)
	return err
}

func (r *UserRepo) UpdateGroup(ctx context.Context, tx pgx.Tx, g *model.Group) error {
	_, err := tx.Exec(ctx, `
		UPDATE groups SET name = $2, description = $3, permissions = $4 WHERE id = $1
	`, g.ID, g.Name, g.Description, g.Permissions)
	return err
}

func (r *UserRepo) DeleteGroup(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM groups WHERE id = $1`, id)
	return err
}

func (r *UserRepo) AddUserToGroup(ctx context.Context, tx pgx.Tx, userID, groupID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, groupID)
	return err
}

func (r *UserRepo) RemoveUserFromGroup(ctx context.Context, tx pgx.Tx, userID, groupID string) error {
	_, err := tx.Exec(ctx, `DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2`, userID, groupID)
	return err
}

func (r *UserRepo) GetUserGroups(ctx context.Context, tx pgx.Tx, userID string) ([]*model.Group, error) {
	rows, err := tx.Query(ctx, `
		SELECT g.id, g.org_id, g.name, g.description, g.permissions, g.created_at
		FROM groups g JOIN user_groups ug ON g.id = ug.group_id
		WHERE ug.user_id = $1 ORDER BY g.name
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*model.Group
	for rows.Next() {
		g := &model.Group{}
		if err := rows.Scan(&g.ID, &g.OrgID, &g.Name, &g.Description, &g.Permissions, &g.CreatedAt); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

func (r *UserRepo) GetGroupMembers(ctx context.Context, tx pgx.Tx, groupID string, params PaginationParams) ([]*model.User, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	var totalCount int
	if err := tx.QueryRow(ctx, "SELECT COUNT(*) FROM user_groups WHERE group_id = $1", groupID).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	rows, err := tx.Query(ctx, `
		SELECT u.id, u.org_id, u.email, u.password_hash, u.display_name, u.job_title,
		       u.department, u.profile_picture_url, u.status, u.totp_secret, u.totp_enabled,
		       u.last_login_at, u.failed_login_count, u.created_at, u.updated_at
		FROM users u JOIN user_groups ug ON u.id = ug.user_id
		WHERE ug.group_id = $1 ORDER BY u.display_name LIMIT $2 OFFSET $3
	`, groupID, limit+1, offset)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(
			&u.ID, &u.OrgID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.JobTitle,
			&u.Department, &u.ProfilePictureURL, &u.Status, &u.TOTPSecret, &u.TOTPEnabled,
			&u.LastLoginAt, &u.FailedLoginCount, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, err
		}
		users = append(users, u)
	}

	hasNext := len(users) > limit
	if hasNext {
		users = users[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(users) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(users) - 1)
	}

	return users, result, nil
}

// Refresh token operations

func (r *UserRepo) StoreRefreshToken(ctx context.Context, tx pgx.Tx, token *model.RefreshToken) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`, token.ID, token.UserID, token.TokenHash, token.ExpiresAt)
	return err
}

func (r *UserRepo) GetRefreshTokenByHash(ctx context.Context, tx pgx.Tx, hash string) (*model.RefreshToken, error) {
	t := &model.RefreshToken{}
	err := tx.QueryRow(ctx, `
		SELECT id, user_id, token_hash, expires_at, created_at, revoked
		FROM refresh_tokens WHERE token_hash = $1 AND revoked = false
	`, hash).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.CreatedAt, &t.Revoked)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *UserRepo) RevokeRefreshToken(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE id = $1`, id)
	return err
}

func (r *UserRepo) RevokeAllUserRefreshTokens(ctx context.Context, tx pgx.Tx, userID string) error {
	_, err := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, userID)
	return err
}

// UserFilter holds filter criteria for user queries.
type UserFilter struct {
	Status  *string
	Search  *string
	GroupID *string
}
