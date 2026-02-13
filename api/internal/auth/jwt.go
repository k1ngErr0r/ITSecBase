package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims for access tokens.
type Claims struct {
	jwt.RegisteredClaims
	UserID string   `json:"uid"`
	OrgID  string   `json:"oid"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
}

// GenerateAccessToken creates a signed JWT access token.
func GenerateAccessToken(userID, orgID, email string, roles []string, secret string, expiry time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			Issuer:    "secbase",
		},
		UserID: userID,
		OrgID:  orgID,
		Email:  email,
		Roles:  roles,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return signed, nil
}

// GenerateRefreshToken generates a cryptographically random refresh token.
// Returns the plain token (to send to client) and its SHA-256 hash (to store in DB).
func GenerateRefreshToken() (plainToken string, hashedToken string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}

	plain := hex.EncodeToString(b)
	hashed := HashRefreshToken(plain)
	return plain, hashed, nil
}

// ValidateAccessToken parses and validates a JWT access token.
func ValidateAccessToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// HashRefreshToken returns the SHA-256 hash of a refresh token.
func HashRefreshToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
