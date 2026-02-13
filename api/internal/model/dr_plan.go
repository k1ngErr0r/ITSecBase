package model

import "time"

type DrPlan struct {
	ID         string     `json:"id"`
	OrgID      string     `json:"orgId"`
	Name       string     `json:"name"`
	Scope      string     `json:"scope"`
	OwnerID    *string    `json:"ownerId"`
	Version    string     `json:"version"`
	RTOMinutes *int       `json:"rtoMinutes"`
	RPOMinutes *int       `json:"rpoMinutes"`
	Playbook   string     `json:"playbook"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type DrTest struct {
	ID           string     `json:"id"`
	DrPlanID     string     `json:"drPlanId"`
	TestType     string     `json:"testType"`
	PlannedDate  *time.Time `json:"plannedDate"`
	ActualDate   *time.Time `json:"actualDate"`
	Result       string     `json:"result"`
	Observations string     `json:"observations"`
	CreatedAt    time.Time  `json:"createdAt"`
}
