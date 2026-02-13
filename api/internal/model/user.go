package model

import "time"

type Organisation struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type User struct {
	ID               string     `json:"id"`
	OrgID            string     `json:"orgId"`
	Email            string     `json:"email"`
	PasswordHash     string     `json:"-"`
	DisplayName      string     `json:"displayName"`
	JobTitle         string     `json:"jobTitle"`
	Department       string     `json:"department"`
	ProfilePictureURL string    `json:"profilePictureUrl"`
	Status           string     `json:"status"`
	TOTPSecret       string     `json:"-"`
	TOTPEnabled      bool       `json:"totpEnabled"`
	LastLoginAt      *time.Time `json:"lastLoginAt"`
	FailedLoginCount int        `json:"failedLoginCount"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type Group struct {
	ID          string   `json:"id"`
	OrgID       string   `json:"orgId"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	CreatedAt   time.Time `json:"createdAt"`
}

type RefreshToken struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	Revoked   bool      `json:"revoked"`
}
