package repository

import (
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

func TestUserRepo_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u := &model.User{
			OrgID:        orgID,
			Email:        "create-test@example.com",
			PasswordHash: "hashed",
			DisplayName:  "Create Test",
			JobTitle:     "Engineer",
			Department:   "Eng",
			Status:       "active",
		}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}
		if u.ID == "" {
			t.Error("expected ID to be set after create")
		}
		if u.CreatedAt.IsZero() {
			t.Error("expected CreatedAt to be set")
		}

		got, err := repo.GetByID(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if got.Email != "create-test@example.com" {
			t.Errorf("email = %q, want %q", got.Email, "create-test@example.com")
		}
		if got.DisplayName != "Create Test" {
			t.Errorf("displayName = %q, want %q", got.DisplayName, "Create Test")
		}
		if got.Status != "active" {
			t.Errorf("status = %q, want %q", got.Status, "active")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_GetByEmail(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u := &model.User{
			OrgID:        orgID,
			Email:        "byemail@example.com",
			PasswordHash: "hash",
			DisplayName:  "Email User",
			Status:       "active",
		}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}

		got, err := repo.GetByEmail(ctx, tx, "byemail@example.com")
		if err != nil {
			return err
		}
		if got.ID != u.ID {
			t.Errorf("GetByEmail returned wrong user: got %s, want %s", got.ID, u.ID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_List(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		for i := 0; i < 3; i++ {
			u := &model.User{
				OrgID:        orgID,
				Email:        fmt.Sprintf("list-%d@example.com", i),
				PasswordHash: "hash",
				DisplayName:  fmt.Sprintf("User %d", i),
				Status:       "active",
			}
			if err := repo.Create(ctx, tx, u); err != nil {
				return err
			}
		}

		users, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, nil)
		if err != nil {
			return err
		}
		if len(users) != 3 {
			t.Errorf("List returned %d users, want 3", len(users))
		}
		if pr.TotalCount != 3 {
			t.Errorf("TotalCount = %d, want 3", pr.TotalCount)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_ListWithFilter(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u1 := &model.User{OrgID: orgID, Email: "active@ex.com", PasswordHash: "h", DisplayName: "Active", Status: "active"}
		u2 := &model.User{OrgID: orgID, Email: "disabled@ex.com", PasswordHash: "h", DisplayName: "Disabled", Status: "disabled"}
		if err := repo.Create(ctx, tx, u1); err != nil {
			return err
		}
		if err := repo.Create(ctx, tx, u2); err != nil {
			return err
		}

		status := "active"
		users, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, &UserFilter{Status: &status})
		if err != nil {
			return err
		}
		if len(users) != 1 {
			t.Errorf("filtered List returned %d users, want 1", len(users))
		}
		if pr.TotalCount != 1 {
			t.Errorf("TotalCount = %d, want 1", pr.TotalCount)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u := &model.User{OrgID: orgID, Email: "update@ex.com", PasswordHash: "h", DisplayName: "Before", Status: "active"}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}
		u.DisplayName = "After"
		u.JobTitle = "Lead"
		if err := repo.Update(ctx, tx, u); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if got.DisplayName != "After" {
			t.Errorf("DisplayName = %q, want %q", got.DisplayName, "After")
		}
		if got.JobTitle != "Lead" {
			t.Errorf("JobTitle = %q, want %q", got.JobTitle, "Lead")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_UpdatePassword(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u := &model.User{OrgID: orgID, Email: "pw@ex.com", PasswordHash: "old", DisplayName: "PW", Status: "active"}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}
		if err := repo.UpdatePassword(ctx, tx, u.ID, "newhash"); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if got.PasswordHash != "newhash" {
			t.Errorf("PasswordHash = %q, want %q", got.PasswordHash, "newhash")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_GroupCRUDAndMembership(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		// Create user
		u := &model.User{OrgID: orgID, Email: "grp@ex.com", PasswordHash: "h", DisplayName: "GroupUser", Status: "active"}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}

		// Create group
		g := &model.Group{OrgID: orgID, Name: "Admins", Description: "Admin group", Permissions: []string{"admin"}}
		if err := repo.CreateGroup(ctx, tx, g); err != nil {
			return err
		}
		if g.ID == "" {
			t.Error("group ID should be set")
		}

		// Add user to group
		if err := repo.AddUserToGroup(ctx, tx, u.ID, g.ID); err != nil {
			return err
		}

		// Verify user groups
		groups, err := repo.GetUserGroups(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if len(groups) != 1 {
			t.Errorf("user has %d groups, want 1", len(groups))
		}

		// Verify group members
		members, pr, err := repo.GetGroupMembers(ctx, tx, g.ID, PaginationParams{First: 10})
		if err != nil {
			return err
		}
		if len(members) != 1 {
			t.Errorf("group has %d members, want 1", len(members))
		}
		if pr.TotalCount != 1 {
			t.Errorf("member TotalCount = %d, want 1", pr.TotalCount)
		}

		// Remove from group
		if err := repo.RemoveUserFromGroup(ctx, tx, u.ID, g.ID); err != nil {
			return err
		}
		groups2, err := repo.GetUserGroups(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if len(groups2) != 0 {
			t.Errorf("after removal, user has %d groups, want 0", len(groups2))
		}

		// Delete group
		if err := repo.DeleteGroup(ctx, tx, g.ID); err != nil {
			return err
		}
		_, err = repo.GetGroupByID(ctx, tx, g.ID)
		if err == nil {
			t.Error("expected error getting deleted group")
		}

		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestUserRepo_IncrementFailedLogin(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewUserRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		u := &model.User{OrgID: orgID, Email: "fail@ex.com", PasswordHash: "h", DisplayName: "Fail", Status: "active"}
		if err := repo.Create(ctx, tx, u); err != nil {
			return err
		}
		if err := repo.IncrementFailedLogin(ctx, tx, u.ID); err != nil {
			return err
		}
		if err := repo.IncrementFailedLogin(ctx, tx, u.ID); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if got.FailedLoginCount != 2 {
			t.Errorf("FailedLoginCount = %d, want 2", got.FailedLoginCount)
		}

		// UpdateLastLogin should reset count
		if err := repo.UpdateLastLogin(ctx, tx, u.ID); err != nil {
			return err
		}
		got2, err := repo.GetByID(ctx, tx, u.ID)
		if err != nil {
			return err
		}
		if got2.FailedLoginCount != 0 {
			t.Errorf("after login, FailedLoginCount = %d, want 0", got2.FailedLoginCount)
		}
		if got2.LastLoginAt == nil {
			t.Error("LastLoginAt should be set after UpdateLastLogin")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
