package model

import (
	"encoding/json"
	"time"
)

type Comment struct {
	ID         string    `json:"id"`
	OrgID      string    `json:"orgId"`
	EntityType string    `json:"entityType"`
	EntityID   string    `json:"entityId"`
	AuthorID   string    `json:"authorId"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Evidence struct {
	ID          string    `json:"id"`
	OrgID       string    `json:"orgId"`
	EntityType  string    `json:"entityType"`
	EntityID    string    `json:"entityId"`
	FileName    string    `json:"fileName"`
	FilePath    string    `json:"filePath"`
	FileSize    int64     `json:"fileSize"`
	ContentType string    `json:"contentType"`
	UploadedBy  string    `json:"uploadedBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

type SavedView struct {
	ID           string          `json:"id"`
	OrgID        string          `json:"orgId"`
	UserID       string          `json:"userId"`
	EntityType   string          `json:"entityType"`
	Name         string          `json:"name"`
	FilterConfig json.RawMessage `json:"filterConfig"`
	IsDefault    bool            `json:"isDefault"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

type CveFeedEntry struct {
	ID               string     `json:"id"`
	CveID            string     `json:"cveId"`
	Score            *float64   `json:"score"`
	AffectedProducts []string   `json:"affectedProducts"`
	PublishedDate    *time.Time `json:"publishedDate"`
	Link             string     `json:"link"`
	FetchedAt        time.Time  `json:"fetchedAt"`
}
