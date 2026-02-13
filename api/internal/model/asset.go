package model

import "time"

type Asset struct {
	ID                string     `json:"id"`
	OrgID             string     `json:"orgId"`
	Name              string     `json:"name"`
	AssetType         string     `json:"assetType"`
	Make              string     `json:"make"`
	Model             string     `json:"model"`
	Version           string     `json:"version"`
	BusinessOwnerID   *string    `json:"businessOwnerId"`
	TechnicalOwnerID  *string    `json:"technicalOwnerId"`
	IPAddresses       []string   `json:"ipAddresses"`
	Hostnames         []string   `json:"hostnames"`
	FQDN              string     `json:"fqdn"`
	URL               string     `json:"url"`
	LocationSite      string     `json:"locationSite"`
	LocationDetail    string     `json:"locationDetail"`
	Environment       string     `json:"environment"`
	Criticality       int        `json:"criticality"`
	DataClassification string   `json:"dataClassification"`
	Tags              []string   `json:"tags"`
	Status            string     `json:"status"`
	DecommissionDate  *time.Time `json:"decommissionDate"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}
