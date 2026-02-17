package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	gqlhandler "github.com/99designs/gqlgen/graphql/handler"
	"github.com/k1ngErr0r/ITSecBase/api/internal/auth"
	"github.com/k1ngErr0r/ITSecBase/api/internal/config"
	"github.com/k1ngErr0r/ITSecBase/api/internal/database"
	"github.com/k1ngErr0r/ITSecBase/api/internal/middleware"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
	"github.com/k1ngErr0r/ITSecBase/api/internal/repository"

	"github.com/jackc/pgx/v5"
)

var (
	testDB     *database.DB
	testConfig *config.Config
)

func TestMain(m *testing.M) {
	host := getTestEnv("POSTGRES_HOST", "localhost")
	port := getTestEnv("POSTGRES_PORT", "5432")
	user := getTestEnv("POSTGRES_USER", "secbase")
	pass := getTestEnv("POSTGRES_PASSWORD", "changeme_in_production")
	dbName := getTestEnv("POSTGRES_DB", "secbase_test")
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, dbName)

	if err := database.RunMigrations(dsn); err != nil {
		fmt.Fprintf(os.Stderr, "migration error (skipping graph tests): %v\n", err)
		os.Exit(0)
	}

	ctx := context.Background()
	db, err := database.NewDB(ctx, dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "db connect error (skipping graph tests): %v\n", err)
		os.Exit(0)
	}
	testDB = db
	testConfig = &config.Config{
		JWT: config.JWTConfig{
			Secret:             "test-secret-key-for-integration-tests",
			AccessTokenExpiry:  15 * time.Minute,
			RefreshTokenExpiry: 168 * time.Hour,
		},
		UploadDir: os.TempDir(),
	}

	code := m.Run()
	testDB.Close()
	os.Exit(code)
}

func getTestEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// graphqlRequest holds a GraphQL request payload.
type graphqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

// graphqlResponse holds a GraphQL response payload.
type graphqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// testServer creates a test HTTP handler backed by the real GraphQL resolver stack.
// It returns an HTTP handler and a cleanup function.
func testServer(t *testing.T) (http.Handler, string, context.Context) {
	t.Helper()
	ctx := context.Background()

	// Create test org
	slug := fmt.Sprintf("graphtest-%d", time.Now().UnixNano())
	var orgID string
	err := testDB.Pool.QueryRow(ctx,
		"INSERT INTO organisations (name, slug) VALUES ($1, $2) RETURNING id",
		"GraphQL Test Org", slug,
	).Scan(&orgID)
	if err != nil {
		t.Fatalf("create test org: %v", err)
	}
	t.Cleanup(func() {
		_, _ = testDB.Pool.Exec(context.Background(), "DELETE FROM organisations WHERE id = $1", orgID)
	})

	// Create a test user via repo
	orgCtx := middleware.WithOrgID(ctx, orgID)
	var testUserID string
	err = testDB.WithTx(orgCtx, func(tx pgx.Tx) error {
		hashed, err := auth.HashPassword("testpassword123")
		if err != nil {
			return err
		}
		u := &model.User{
			OrgID:        orgID,
			Email:        "graphtest@example.com",
			PasswordHash: hashed,
			DisplayName:  "GraphQL Test User",
			Status:       "active",
		}
		repo := repository.NewUserRepo()
		if err := repo.Create(orgCtx, tx, u); err != nil {
			return err
		}
		testUserID = u.ID
		return nil
	})
	if err != nil {
		t.Fatalf("create test user: %v", err)
	}

	resolver := NewResolver(testDB, testConfig)
	gqlSrv := gqlhandler.NewDefaultServer(NewExecutableSchema(Config{Resolvers: resolver}))

	// Wrap the handler to inject auth+tenant context on every request
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		ctx = auth.WithClaims(ctx, &auth.Claims{
			UserID: testUserID,
			OrgID:  orgID,
			Email:  "graphtest@example.com",
		})
		ctx = middleware.WithOrgID(ctx, orgID)
		gqlSrv.ServeHTTP(w, r.WithContext(ctx))
	})

	return handler, orgID, orgCtx
}

// execGraphQL sends a GraphQL request and returns the parsed response.
func execGraphQL(t *testing.T, handler http.Handler, req graphqlRequest) graphqlResponse {
	t.Helper()
	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	httpReq := httptest.NewRequest("POST", "/graphql", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httpReq)

	var resp graphqlResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response (status %d): %v\nbody: %s", rec.Code, err, rec.Body.String())
	}
	return resp
}

func TestGraphQL_HealthQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	resp := execGraphQL(t, handler, graphqlRequest{
		Query: `query { health }`,
	})
	if len(resp.Errors) > 0 {
		t.Fatalf("unexpected errors: %v", resp.Errors)
	}

	var data struct {
		Health bool `json:"health"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("unmarshal data: %v", err)
	}
	if !data.Health {
		t.Error("health query returned false")
	}
}

func TestGraphQL_VulnerabilityCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	// Create
	createResp := execGraphQL(t, handler, graphqlRequest{
		Query: `mutation($input: CreateVulnerabilityInput!) {
			createVulnerability(input: $input) {
				id title severity status
			}
		}`,
		Variables: map[string]any{
			"input": map[string]any{
				"title":    "Test SQL Injection",
				"severity": "critical",
			},
		},
	})
	if len(createResp.Errors) > 0 {
		t.Fatalf("create errors: %v", createResp.Errors)
	}

	var createData struct {
		CreateVulnerability struct {
			ID       string `json:"id"`
			Title    string `json:"title"`
			Severity string `json:"severity"`
			Status   string `json:"status"`
		} `json:"createVulnerability"`
	}
	if err := json.Unmarshal(createResp.Data, &createData); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}
	vulnID := createData.CreateVulnerability.ID
	if vulnID == "" {
		t.Fatal("expected vulnerability ID")
	}
	if createData.CreateVulnerability.Status != "new" {
		t.Errorf("Status = %q, want %q", createData.CreateVulnerability.Status, "new")
	}

	// Query single
	getResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query($id: ID!) {
			vulnerability(id: $id) {
				id title severity
			}
		}`,
		Variables: map[string]any{"id": vulnID},
	})
	if len(getResp.Errors) > 0 {
		t.Fatalf("get errors: %v", getResp.Errors)
	}

	var getData struct {
		Vulnerability struct {
			Title string `json:"title"`
		} `json:"vulnerability"`
	}
	if err := json.Unmarshal(getResp.Data, &getData); err != nil {
		t.Fatalf("unmarshal get: %v", err)
	}
	if getData.Vulnerability.Title != "Test SQL Injection" {
		t.Errorf("Title = %q, want %q", getData.Vulnerability.Title, "Test SQL Injection")
	}

	// List
	listResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			vulnerabilities(first: 10) {
				totalCount
				edges { node { id title } }
			}
		}`,
	})
	if len(listResp.Errors) > 0 {
		t.Fatalf("list errors: %v", listResp.Errors)
	}

	var listData struct {
		Vulnerabilities struct {
			TotalCount int `json:"totalCount"`
		} `json:"vulnerabilities"`
	}
	if err := json.Unmarshal(listResp.Data, &listData); err != nil {
		t.Fatalf("unmarshal list: %v", err)
	}
	if listData.Vulnerabilities.TotalCount < 1 {
		t.Errorf("TotalCount = %d, want >= 1", listData.Vulnerabilities.TotalCount)
	}

	// Update
	updateResp := execGraphQL(t, handler, graphqlRequest{
		Query: `mutation($id: ID!, $input: UpdateVulnerabilityInput!) {
			updateVulnerability(id: $id, input: $input) {
				id title status
			}
		}`,
		Variables: map[string]any{
			"id": vulnID,
			"input": map[string]any{
				"title":  "Updated SQL Injection",
				"status": "triaged",
			},
		},
	})
	if len(updateResp.Errors) > 0 {
		t.Fatalf("update errors: %v", updateResp.Errors)
	}

	var updateData struct {
		UpdateVulnerability struct {
			Title  string `json:"title"`
			Status string `json:"status"`
		} `json:"updateVulnerability"`
	}
	if err := json.Unmarshal(updateResp.Data, &updateData); err != nil {
		t.Fatalf("unmarshal update: %v", err)
	}
	if updateData.UpdateVulnerability.Title != "Updated SQL Injection" {
		t.Errorf("Title = %q, want %q", updateData.UpdateVulnerability.Title, "Updated SQL Injection")
	}

	// Delete
	deleteResp := execGraphQL(t, handler, graphqlRequest{
		Query: `mutation($id: ID!) {
			deleteVulnerability(id: $id)
		}`,
		Variables: map[string]any{"id": vulnID},
	})
	if len(deleteResp.Errors) > 0 {
		t.Fatalf("delete errors: %v", deleteResp.Errors)
	}
}

func TestGraphQL_RiskCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	// Create
	createResp := execGraphQL(t, handler, graphqlRequest{
		Query: `mutation($input: CreateRiskInput!) {
			createRisk(input: $input) {
				id title status calculatedInherentLevel
			}
		}`,
		Variables: map[string]any{
			"input": map[string]any{
				"title":              "Data Breach Risk",
				"category":           "information security",
				"inherentLikelihood": 4,
				"inherentImpact":     5,
			},
		},
	})
	if len(createResp.Errors) > 0 {
		t.Fatalf("create risk errors: %v", createResp.Errors)
	}

	var createData struct {
		CreateRisk struct {
			ID                      string `json:"id"`
			Title                   string `json:"title"`
			Status                  string `json:"status"`
			CalculatedInherentLevel string `json:"calculatedInherentLevel"`
		} `json:"createRisk"`
	}
	if err := json.Unmarshal(createResp.Data, &createData); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if createData.CreateRisk.ID == "" {
		t.Fatal("expected risk ID")
	}
	if createData.CreateRisk.Status != "identified" {
		t.Errorf("Status = %q, want %q", createData.CreateRisk.Status, "identified")
	}
	if createData.CreateRisk.CalculatedInherentLevel != "20" {
		t.Errorf("CalculatedInherentLevel = %q, want %q", createData.CreateRisk.CalculatedInherentLevel, "20")
	}

	// Query single
	riskID := createData.CreateRisk.ID
	getResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query($id: ID!) {
			risk(id: $id) {
				id title treatments { id }
			}
		}`,
		Variables: map[string]any{"id": riskID},
	})
	if len(getResp.Errors) > 0 {
		t.Fatalf("get risk errors: %v", getResp.Errors)
	}

	// Delete
	deleteResp := execGraphQL(t, handler, graphqlRequest{
		Query:     `mutation($id: ID!) { deleteRisk(id: $id) }`,
		Variables: map[string]any{"id": riskID},
	})
	if len(deleteResp.Errors) > 0 {
		t.Fatalf("delete risk errors: %v", deleteResp.Errors)
	}
}

func TestGraphQL_IncidentCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	// Create
	createResp := execGraphQL(t, handler, graphqlRequest{
		Query: `mutation($input: CreateIncidentInput!) {
			createIncident(input: $input) {
				id name status impactRating
			}
		}`,
		Variables: map[string]any{
			"input": map[string]any{
				"name":         "Phishing Campaign",
				"area":         "email",
				"impactRating": "high",
			},
		},
	})
	if len(createResp.Errors) > 0 {
		t.Fatalf("create incident errors: %v", createResp.Errors)
	}

	var createData struct {
		CreateIncident struct {
			ID           string `json:"id"`
			Name         string `json:"name"`
			Status       string `json:"status"`
			ImpactRating string `json:"impactRating"`
		} `json:"createIncident"`
	}
	if err := json.Unmarshal(createResp.Data, &createData); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if createData.CreateIncident.ID == "" {
		t.Fatal("expected incident ID")
	}
	if createData.CreateIncident.Status != "new" {
		t.Errorf("Status = %q, want %q", createData.CreateIncident.Status, "new")
	}

	// List
	listResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			incidents(first: 10) {
				totalCount
				edges { node { id name } }
			}
		}`,
	})
	if len(listResp.Errors) > 0 {
		t.Fatalf("list incidents errors: %v", listResp.Errors)
	}

	// Delete
	deleteResp := execGraphQL(t, handler, graphqlRequest{
		Query:     `mutation($id: ID!) { deleteIncident(id: $id) }`,
		Variables: map[string]any{"id": createData.CreateIncident.ID},
	})
	if len(deleteResp.Errors) > 0 {
		t.Fatalf("delete incident errors: %v", deleteResp.Errors)
	}
}

func TestGraphQL_Login(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	// For login, we need a handler that does NOT inject auth context
	// (login works without auth), but we need the middleware.WithOrgID for RLS.
	ctx := context.Background()
	slug := fmt.Sprintf("logintest-%d", time.Now().UnixNano())
	var orgID string
	err := testDB.Pool.QueryRow(ctx,
		"INSERT INTO organisations (name, slug) VALUES ($1, $2) RETURNING id",
		"Login Test Org", slug,
	).Scan(&orgID)
	if err != nil {
		t.Fatalf("create test org: %v", err)
	}
	t.Cleanup(func() {
		_, _ = testDB.Pool.Exec(context.Background(), "DELETE FROM organisations WHERE id = $1", orgID)
	})

	orgCtx := middleware.WithOrgID(ctx, orgID)
	err = testDB.WithTx(orgCtx, func(tx pgx.Tx) error {
		hashed, err := auth.HashPassword("loginpassword123")
		if err != nil {
			return err
		}
		u := &model.User{
			OrgID:        orgID,
			Email:        "loginuser@example.com",
			PasswordHash: hashed,
			DisplayName:  "Login User",
			Status:       "active",
		}
		repo := repository.NewUserRepo()
		return repo.Create(orgCtx, tx, u)
	})
	if err != nil {
		t.Fatalf("create login user: %v", err)
	}

	resolver := NewResolver(testDB, testConfig)
	gqlSrv := gqlhandler.NewDefaultServer(NewExecutableSchema(Config{Resolvers: resolver}))

	// Login handler injects org context for RLS but no auth claims
	loginHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := middleware.WithOrgID(r.Context(), orgID)
		gqlSrv.ServeHTTP(w, r.WithContext(ctx))
	})

	// Test successful login
	resp := execGraphQL(t, loginHandler, graphqlRequest{
		Query: `mutation($input: LoginInput!) {
			login(input: $input) {
				accessToken
				refreshToken
				user { id email displayName }
			}
		}`,
		Variables: map[string]any{
			"input": map[string]any{
				"email":    "loginuser@example.com",
				"password": "loginpassword123",
			},
		},
	})
	if len(resp.Errors) > 0 {
		t.Fatalf("login errors: %v", resp.Errors)
	}

	var loginData struct {
		Login struct {
			AccessToken  string `json:"accessToken"`
			RefreshToken string `json:"refreshToken"`
			User         struct {
				Email string `json:"email"`
			} `json:"user"`
		} `json:"login"`
	}
	if err := json.Unmarshal(resp.Data, &loginData); err != nil {
		t.Fatalf("unmarshal login: %v", err)
	}
	if loginData.Login.AccessToken == "" {
		t.Error("expected access token")
	}
	if loginData.Login.RefreshToken == "" {
		t.Error("expected refresh token")
	}
	if loginData.Login.User.Email != "loginuser@example.com" {
		t.Errorf("Email = %q, want %q", loginData.Login.User.Email, "loginuser@example.com")
	}

	// Test wrong password
	badResp := execGraphQL(t, loginHandler, graphqlRequest{
		Query: `mutation($input: LoginInput!) {
			login(input: $input) { accessToken }
		}`,
		Variables: map[string]any{
			"input": map[string]any{
				"email":    "loginuser@example.com",
				"password": "wrongpassword",
			},
		},
	})
	if len(badResp.Errors) == 0 {
		t.Error("expected error for wrong password")
	}
}

func TestGraphQL_DashboardQueries(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	// Vulnerability overview
	vulnResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			vulnOverview {
				totalOpen criticalCount highCount
			}
		}`,
	})
	if len(vulnResp.Errors) > 0 {
		t.Fatalf("vuln overview errors: %v", vulnResp.Errors)
	}

	// Incident summary
	incResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			incidentStatus {
				slaBreaches
				openByImpact { impact count }
			}
		}`,
	})
	if len(incResp.Errors) > 0 {
		t.Fatalf("incident summary errors: %v", incResp.Errors)
	}

	// DR readiness
	drResp := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			drReadiness {
				lastTestResult playbookVersion
			}
		}`,
	})
	if len(drResp.Errors) > 0 {
		t.Fatalf("dr readiness errors: %v", drResp.Errors)
	}
}

func TestGraphQL_Pagination(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	handler, _, _ := testServer(t)

	// Create 3 vulnerabilities
	for i := 0; i < 3; i++ {
		createResp := execGraphQL(t, handler, graphqlRequest{
			Query: `mutation($input: CreateVulnerabilityInput!) {
				createVulnerability(input: $input) { id }
			}`,
			Variables: map[string]any{
				"input": map[string]any{
					"title":    fmt.Sprintf("Pagination Vuln %d", i),
					"severity": "medium",
				},
			},
		})
		if len(createResp.Errors) > 0 {
			t.Fatalf("create vuln %d errors: %v", i, createResp.Errors)
		}
	}

	// Fetch first page (2 items)
	page1 := execGraphQL(t, handler, graphqlRequest{
		Query: `query {
			vulnerabilities(first: 2) {
				totalCount
				pageInfo { hasNextPage endCursor }
				edges { cursor node { id title } }
			}
		}`,
	})
	if len(page1.Errors) > 0 {
		t.Fatalf("page 1 errors: %v", page1.Errors)
	}

	var page1Data struct {
		Vulnerabilities struct {
			TotalCount int `json:"totalCount"`
			PageInfo   struct {
				HasNextPage bool    `json:"hasNextPage"`
				EndCursor   *string `json:"endCursor"`
			} `json:"pageInfo"`
			Edges []struct {
				Cursor string `json:"cursor"`
			} `json:"edges"`
		} `json:"vulnerabilities"`
	}
	if err := json.Unmarshal(page1.Data, &page1Data); err != nil {
		t.Fatalf("unmarshal page1: %v", err)
	}
	if page1Data.Vulnerabilities.TotalCount < 3 {
		t.Errorf("TotalCount = %d, want >= 3", page1Data.Vulnerabilities.TotalCount)
	}
	if len(page1Data.Vulnerabilities.Edges) != 2 {
		t.Errorf("page 1 edges = %d, want 2", len(page1Data.Vulnerabilities.Edges))
	}
	if !page1Data.Vulnerabilities.PageInfo.HasNextPage {
		t.Error("expected hasNextPage = true")
	}

	// Fetch second page
	if page1Data.Vulnerabilities.PageInfo.EndCursor != nil {
		page2 := execGraphQL(t, handler, graphqlRequest{
			Query: `query($after: String) {
				vulnerabilities(first: 2, after: $after) {
					edges { node { id title } }
				}
			}`,
			Variables: map[string]any{
				"after": *page1Data.Vulnerabilities.PageInfo.EndCursor,
			},
		})
		if len(page2.Errors) > 0 {
			t.Fatalf("page 2 errors: %v", page2.Errors)
		}

		var page2Data struct {
			Vulnerabilities struct {
				Edges []struct {
					Node struct {
						ID string `json:"id"`
					} `json:"node"`
				} `json:"edges"`
			} `json:"vulnerabilities"`
		}
		if err := json.Unmarshal(page2.Data, &page2Data); err != nil {
			t.Fatalf("unmarshal page2: %v", err)
		}
		if len(page2Data.Vulnerabilities.Edges) == 0 {
			t.Error("expected at least 1 edge on page 2")
		}
	}
}
