package repository

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
)

// PaginationParams holds cursor-based pagination parameters.
type PaginationParams struct {
	First int
	After string
}

// PaginationResult holds pagination metadata for a query result.
type PaginationResult struct {
	HasNextPage     bool
	HasPreviousPage bool
	StartCursor     string
	EndCursor       string
	TotalCount      int
}

// DefaultPageSize is the default number of items per page.
const DefaultPageSize = 25

// MaxPageSize is the maximum number of items per page.
const MaxPageSize = 100

// EncodeCursor creates a base64-encoded cursor from an offset.
func EncodeCursor(offset int) string {
	return base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("cursor:%d", offset)))
}

// DecodeCursor decodes a base64-encoded cursor to an offset.
func DecodeCursor(cursor string) (int, error) {
	if cursor == "" {
		return 0, nil
	}
	decoded, err := base64.StdEncoding.DecodeString(cursor)
	if err != nil {
		return 0, fmt.Errorf("invalid cursor: %w", err)
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 || parts[0] != "cursor" {
		return 0, fmt.Errorf("invalid cursor format")
	}
	offset, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid cursor offset: %w", err)
	}
	return offset, nil
}

// NormalizeFirst clamps the page size to valid bounds.
func NormalizeFirst(first *int) int {
	if first == nil || *first <= 0 {
		return DefaultPageSize
	}
	if *first > MaxPageSize {
		return MaxPageSize
	}
	return *first
}
