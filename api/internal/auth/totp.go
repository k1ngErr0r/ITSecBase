package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/pquerna/otp/totp"
)

// GenerateTOTPSecret creates a new TOTP secret for the given email.
// Returns the raw secret and the provisioning URL for QR code generation.
func GenerateTOTPSecret(email string) (secret string, provisioningURL string, err error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SecBase",
		AccountName: email,
	})
	if err != nil {
		return "", "", fmt.Errorf("generate totp key: %w", err)
	}

	return key.Secret(), key.URL(), nil
}

// ValidateTOTP verifies a TOTP code against the given secret.
func ValidateTOTP(secret, code string) bool {
	return totp.Validate(code, secret)
}

// GenerateBackupCodes generates a set of random backup codes.
func GenerateBackupCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := range codes {
		b := make([]byte, 4)
		if _, err := rand.Read(b); err != nil {
			return nil, fmt.Errorf("generate backup code: %w", err)
		}
		codes[i] = hex.EncodeToString(b)
	}
	return codes, nil
}
