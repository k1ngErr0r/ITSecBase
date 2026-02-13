package auth

import (
	"testing"
	"time"
)

const testSecret = "test-jwt-secret-key-for-unit-tests"

func TestGenerateAccessToken(t *testing.T) {
	token, err := GenerateAccessToken("user-123", "org-456", "user@example.com", []string{"admin"}, testSecret, 15*time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	if token == "" {
		t.Fatal("GenerateAccessToken returned empty string")
	}
}

func TestValidateAccessToken(t *testing.T) {
	token, err := GenerateAccessToken("user-123", "org-456", "user@example.com", []string{"admin", "viewer"}, testSecret, 15*time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	claims, err := ValidateAccessToken(token, testSecret)
	if err != nil {
		t.Fatalf("ValidateAccessToken failed: %v", err)
	}

	if claims.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got '%s'", claims.UserID)
	}
	if claims.OrgID != "org-456" {
		t.Errorf("expected OrgID 'org-456', got '%s'", claims.OrgID)
	}
	if claims.Email != "user@example.com" {
		t.Errorf("expected Email 'user@example.com', got '%s'", claims.Email)
	}
	if len(claims.Roles) != 2 || claims.Roles[0] != "admin" {
		t.Errorf("expected Roles [admin, viewer], got %v", claims.Roles)
	}
	if claims.Issuer != "secbase" {
		t.Errorf("expected Issuer 'secbase', got '%s'", claims.Issuer)
	}
}

func TestValidateAccessToken_WrongSecret(t *testing.T) {
	token, err := GenerateAccessToken("user-123", "org-456", "user@example.com", nil, testSecret, 15*time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	_, err = ValidateAccessToken(token, "wrong-secret")
	if err == nil {
		t.Error("ValidateAccessToken should fail with wrong secret")
	}
}

func TestValidateAccessToken_Expired(t *testing.T) {
	token, err := GenerateAccessToken("user-123", "org-456", "user@example.com", nil, testSecret, -1*time.Minute)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	_, err = ValidateAccessToken(token, testSecret)
	if err == nil {
		t.Error("ValidateAccessToken should fail for expired token")
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	plain, hashed, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken failed: %v", err)
	}

	if plain == "" || hashed == "" {
		t.Fatal("GenerateRefreshToken returned empty strings")
	}

	if plain == hashed {
		t.Error("plain and hashed tokens should differ")
	}

	// Verify hash is deterministic
	if HashRefreshToken(plain) != hashed {
		t.Error("HashRefreshToken should produce the same hash")
	}
}

func TestGenerateRefreshToken_Unique(t *testing.T) {
	plain1, _, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken failed: %v", err)
	}

	plain2, _, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken failed: %v", err)
	}

	if plain1 == plain2 {
		t.Error("two refresh tokens should be unique")
	}
}
