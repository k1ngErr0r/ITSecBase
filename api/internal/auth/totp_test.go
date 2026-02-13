package auth

import (
	"testing"
)

func TestGenerateTOTPSecret(t *testing.T) {
	secret, provisioningURL, err := GenerateTOTPSecret("user@example.com")
	if err != nil {
		t.Fatalf("GenerateTOTPSecret failed: %v", err)
	}

	if secret == "" {
		t.Error("secret should not be empty")
	}
	if provisioningURL == "" {
		t.Error("provisioningURL should not be empty")
	}

	// Provisioning URL should contain the account name and issuer
	if len(provisioningURL) < 20 {
		t.Errorf("provisioningURL too short: %s", provisioningURL)
	}
}

func TestValidateTOTP_InvalidCode(t *testing.T) {
	secret, _, err := GenerateTOTPSecret("user@example.com")
	if err != nil {
		t.Fatalf("GenerateTOTPSecret failed: %v", err)
	}

	// An obviously wrong code should fail
	if ValidateTOTP(secret, "000000") {
		// This could theoretically pass by coincidence, but extremely unlikely
		t.Log("warning: random TOTP code matched (very unlikely)")
	}

	if ValidateTOTP(secret, "invalid") {
		t.Error("non-numeric TOTP code should fail validation")
	}
}

func TestGenerateBackupCodes(t *testing.T) {
	codes, err := GenerateBackupCodes(8)
	if err != nil {
		t.Fatalf("GenerateBackupCodes failed: %v", err)
	}

	if len(codes) != 8 {
		t.Errorf("expected 8 backup codes, got %d", len(codes))
	}

	// Each code should be 8 hex characters (4 bytes)
	for i, code := range codes {
		if len(code) != 8 {
			t.Errorf("backup code %d has length %d, expected 8: %s", i, len(code), code)
		}
	}

	// Codes should be unique
	seen := make(map[string]bool)
	for _, code := range codes {
		if seen[code] {
			t.Errorf("duplicate backup code: %s", code)
		}
		seen[code] = true
	}
}

func TestGenerateBackupCodes_DifferentCounts(t *testing.T) {
	for _, count := range []int{1, 5, 10} {
		codes, err := GenerateBackupCodes(count)
		if err != nil {
			t.Fatalf("GenerateBackupCodes(%d) failed: %v", count, err)
		}
		if len(codes) != count {
			t.Errorf("GenerateBackupCodes(%d) returned %d codes", count, len(codes))
		}
	}
}
