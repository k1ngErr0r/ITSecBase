package auth

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	password := "SecureP@ssw0rd!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == "" {
		t.Fatal("HashPassword returned empty string")
	}

	// Hash should be in argon2id format
	if len(hash) < 50 {
		t.Fatalf("hash too short: %s", hash)
	}
}

func TestComparePassword_Correct(t *testing.T) {
	password := "SecureP@ssw0rd!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	match, err := ComparePassword(hash, password)
	if err != nil {
		t.Fatalf("ComparePassword failed: %v", err)
	}

	if !match {
		t.Error("ComparePassword should return true for correct password")
	}
}

func TestComparePassword_Wrong(t *testing.T) {
	password := "SecureP@ssw0rd!"
	wrongPassword := "WrongPassword!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	match, err := ComparePassword(hash, wrongPassword)
	if err != nil {
		t.Fatalf("ComparePassword failed: %v", err)
	}

	if match {
		t.Error("ComparePassword should return false for wrong password")
	}
}

func TestHashPassword_UniqueSalts(t *testing.T) {
	password := "SamePassword"

	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash1 == hash2 {
		t.Error("two hashes of the same password should differ (unique salts)")
	}
}

func TestComparePassword_InvalidHash(t *testing.T) {
	_, err := ComparePassword("not-a-valid-hash", "password")
	if err == nil {
		t.Error("ComparePassword should return error for invalid hash format")
	}
}
