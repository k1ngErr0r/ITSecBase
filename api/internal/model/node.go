package model

// Node interface marker methods for all entity types.
// gqlgen uses IsNode() to bind GraphQL types that implement the Node interface.

func (Asset) IsNode()                {}
func (User) IsNode()                 {}
func (Group) IsNode()                {}
func (Vulnerability) IsNode()        {}
func (VulnerabilityHistory) IsNode() {}
func (Risk) IsNode()                 {}
func (RiskTreatment) IsNode()        {}
func (Incident) IsNode()             {}
func (IncidentAction) IsNode()       {}
func (DrPlan) IsNode()               {}
func (DrTest) IsNode()               {}
func (IsoControl) IsNode()           {}
func (OrgIsoControl) IsNode()        {}
func (Comment) IsNode()              {}
func (Evidence) IsNode()             {}
