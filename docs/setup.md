# SecBase - Local Development Setup

## Prerequisites

- **Go** 1.24+
- **Node.js** 22+ with npm
- **PostgreSQL** 16+ (or Docker)
- **Make** (optional, for Makefile targets)

## Database Setup

### Option A: Docker (recommended)

```bash
docker run -d \
  --name secbase-db \
  -e POSTGRES_USER=secbase \
  -e POSTGRES_PASSWORD=changeme_in_production \
  -e POSTGRES_DB=secbase \
  -p 5432:5432 \
  postgres:16-alpine
```

### Option B: Local PostgreSQL

Create the database and user:

```sql
CREATE USER secbase WITH PASSWORD 'changeme_in_production';
CREATE DATABASE secbase OWNER secbase;
```

## Environment Configuration

```bash
cp .env.example .env
# Edit .env with your local settings if needed
```

Key variables for development:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=secbase
POSTGRES_PASSWORD=changeme_in_production
POSTGRES_DB=secbase
JWT_SECRET=dev_secret_change_in_production_min_64_chars_aaaaaaaaaaaaaaaaaa
API_PORT=8080
```

## Backend Setup

```bash
cd api

# Install dependencies
go mod download

# Run database migrations (auto-runs on server start, or manually)
go run ./cmd/server

# Or use Make
make dev-api
```

The API server starts at `http://localhost:8080` with the GraphQL playground available at the root URL.

### Code Generation

If you modify `.graphqls` schema files:

```bash
cd api
go generate ./...
# Or: make generate
```

## Frontend Setup

```bash
cd web

# Install dependencies
npm ci

# Generate Relay artifacts
npx relay-compiler
# Or: npm run relay

# Start development server
npm run dev
# Or: make dev-web
```

The frontend dev server starts at `http://localhost:5173` (Vite default).

## Running Tests

### Backend

```bash
cd api

# Run all tests
go test ./... -v -count=1

# Run with coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Run specific package tests
go test ./internal/repository/... -v
go test ./internal/auth/... -v
```

**Note:** Repository and integration tests require a running PostgreSQL instance. Tests will skip gracefully if the database is unavailable.

### Frontend

```bash
cd web

# Run all tests
npx vitest run

# Watch mode
npx vitest

# With coverage
npx vitest run --coverage
```

## Linting

```bash
# Go
cd api && golangci-lint run

# TypeScript
cd web && npx tsc --noEmit
```

## Database Migrations

Migrations run automatically on server startup via Goose. Migration files are in `api/internal/database/migrations/`:

| File | Description |
|------|-------------|
| `001_init_tenants_users.sql` | Organisations, users, groups, RLS policies |
| `002_assets.sql` | Assets, dependencies, comments, evidence |
| `003_vulnerabilities.sql` | Vulnerability tracking |
| `004_risks.sql` | Risk assessment |
| `005_incidents.sql` | Incident management |
| `006_dr_plans.sql` | Disaster recovery |
| `007_iso_controls.sql` | ISO 27001 compliance controls |
| `008_dashboard.sql` | Dashboard configuration |
| `009_seed_data.sql` | Sample development data |

## Makefile Targets

```bash
make dev-api      # Run Go backend in dev mode
make dev-web      # Run frontend dev server
make build-api    # Production backend build
make build-web    # Production frontend build
make test-api     # Run backend tests
make test-web     # Run frontend tests
make docker-up    # Start full stack via Docker Compose
make docker-up-otel  # Start with observability (Jaeger)
make generate     # Run gqlgen code generation
make relay        # Run Relay compiler
make migrate      # Run database migrations
```

## GraphQL Schema

Schema files are located in `api/internal/graph/schema/`:

- `schema.graphqls` - Core types (Relay Node interface, pagination)
- `user.graphqls` - User and group management
- `asset.graphqls` - Asset management
- `vulnerability.graphqls` - Vulnerability tracking
- `risk.graphqls` - Risk assessment
- `incident.graphqls` - Incident management
- `dr_plan.graphqls` - Disaster recovery
- `iso_control.graphqls` - ISO compliance
- `dashboard.graphqls` - Dashboard widgets and metrics

Access the interactive GraphQL playground at `http://localhost:8080` when the API is running.

## Observability (Optional)

Start the full stack with tracing:

```bash
docker compose --profile observability up -d
```

- **Jaeger UI**: http://localhost:16686
- Traces are collected via OpenTelemetry from both frontend and backend
