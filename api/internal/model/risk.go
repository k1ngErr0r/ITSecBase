package model

import (
	"encoding/json"
	"time"
)

type Risk struct {
	ID                  string     `json:"id"`
	OrgID               string     `json:"orgId"`
	Title               string     `json:"title"`
	Description         string     `json:"description"`
	Scenario            string     `json:"scenario"`
	Category            string     `json:"category"`
	Source               string    `json:"source"`
	InherentLikelihood  int        `json:"inherentLikelihood"`
	InherentImpact      int        `json:"inherentImpact"`
	ResidualLikelihood  int        `json:"residualLikelihood"`
	ResidualImpact      int        `json:"residualImpact"`
	Status              string     `json:"status"`
	OwnerID             *string    `json:"ownerId"`
	ApproverID          *string    `json:"approverId"`
	ReviewDate          *time.Time `json:"reviewDate"`
	LastReviewedBy      *string    `json:"lastReviewedBy"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

type RiskTreatment struct {
	ID            string     `json:"id"`
	RiskID        string     `json:"riskId"`
	Action        string     `json:"action"`
	ResponsibleID *string    `json:"responsibleId"`
	Deadline      *time.Time `json:"deadline"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type RiskMatrixConfig struct {
	ID               string          `json:"id"`
	OrgID            string          `json:"orgId"`
	LikelihoodLabels json.RawMessage `json:"likelihoodLabels"`
	ImpactLabels     json.RawMessage `json:"impactLabels"`
	LevelThresholds  json.RawMessage `json:"levelThresholds"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}
