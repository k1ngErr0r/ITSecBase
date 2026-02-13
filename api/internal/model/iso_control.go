package model

import "time"

type IsoControl struct {
	ID          string `json:"id"`
	ControlID   string `json:"controlId"`
	Name        string `json:"name"`
	Theme       string `json:"theme"`
	Description string `json:"description"`
	IsReference bool   `json:"isReference"`
}

type OrgIsoControl struct {
	ID                            string    `json:"id"`
	OrgID                         string    `json:"orgId"`
	IsoControlID                  string    `json:"isoControlId"`
	Applicability                 string    `json:"applicability"`
	NonApplicabilityJustification string    `json:"nonApplicabilityJustification"`
	ImplementationStatus          string    `json:"implementationStatus"`
	ImplementationDescription     string    `json:"implementationDescription"`
	ResponsibleOwnerID            *string   `json:"responsibleOwnerId"`
	CreatedAt                     time.Time `json:"createdAt"`
	UpdatedAt                     time.Time `json:"updatedAt"`
}
