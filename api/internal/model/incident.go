package model

import "time"

type Incident struct {
	ID                string     `json:"id"`
	OrgID             string     `json:"orgId"`
	Name              string     `json:"name"`
	Area              string     `json:"area"`
	Description       string     `json:"description"`
	ImpactSummary     string     `json:"impactSummary"`
	ImpactRating      string     `json:"impactRating"`
	Classification    []string   `json:"classification"`
	RegulatoryBreach  bool       `json:"regulatoryBreach"`
	ReporterID        *string    `json:"reporterId"`
	OwnerID           *string    `json:"ownerId"`
	Status            string     `json:"status"`
	RootCause         string     `json:"rootCause"`
	RootCauseCategory string     `json:"rootCauseCategory"`
	CorrectiveActions string     `json:"correctiveActions"`
	PreventiveActions string     `json:"preventiveActions"`
	DetectedAt        *time.Time `json:"detectedAt"`
	OpenedAt          time.Time  `json:"openedAt"`
	ContainedAt       *time.Time `json:"containedAt"`
	ResolvedAt        *time.Time `json:"resolvedAt"`
	ClosedAt          *time.Time `json:"closedAt"`
	SLADeadline       *time.Time `json:"slaDeadline"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

type IncidentAction struct {
	ID          string     `json:"id"`
	IncidentID  string     `json:"incidentId"`
	ActionType  string     `json:"actionType"`
	Description string     `json:"description"`
	OwnerID     *string    `json:"ownerId"`
	DueDate     *time.Time `json:"dueDate"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
}
