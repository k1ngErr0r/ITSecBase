# SecBase - Information Security Management Platform

SecBase is a multi-tenant information security management platform providing centralized management of assets, vulnerabilities, risks, incidents, compliance controls, and disaster recovery planning.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  React SPA  │────>│  Go API     │────>│  PostgreSQL 16  │
│  (Relay)    │     │  (GraphQL)  │     │  (RLS tenancy)  │
└─────────────┘     └─────────────┘     └─────────────────┘
      │                   │
      └───────┬───────────┘
              ▼
   ┌─────────────────────┐
   │  OpenTelemetry +    │
   │  Jaeger (optional)  │
   └─────────────────────┘
```

## Tech Stack

| Layer        | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | Go 1.24, Chi router, gqlgen (GraphQL)            |
| Frontend    | React 18, TypeScript, Relay 17, Tailwind CSS 3   |
| Database    | PostgreSQL 16 with Row-Level Security            |
| Auth        | JWT (access + refresh tokens), TOTP/2FA, Argon2  |
| Migrations  | Goose                                            |
| Build       | Docker multi-stage, Vite, nginx                  |
| Observability | OpenTelemetry, Jaeger                          |
| CI/CD       | GitHub Actions (test, lint, govulncheck, build)  |

## Modules

- **Asset Management** - Track hardware, software, cloud resources with dependencies and criticality ratings
- **Vulnerability Management** - CVE tracking, CVSS scoring, remediation workflows, MTTR metrics
- **Risk Assessment** - Risk register with inherent/residual scoring, treatment plans, risk heatmap
- **Incident Management** - Incident lifecycle tracking, SLA deadlines, impact analysis, timeline
- **GRC / Compliance** - ISO 27001 control mapping, compliance gap analysis, audit evidence
- **Disaster Recovery** - DR plan management, playbook versioning, readiness scoring
- **Dashboard** - Real-time widgets with vulnerability overview, risk posture, incident status, compliance snapshot

## Quick Start

```bash
# Clone and start
git clone <repo-url> && cd ITSecBase
cp .env.example .env
docker compose up -d

# Access
# Frontend: http://localhost:3000
# GraphQL Playground: http://localhost:8080
# Default login: admin@secbase.local / Admin123!@#
```

## Development Setup

See [docs/setup.md](docs/setup.md) for detailed local development instructions.

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment guidance.

## Testing

```bash
# Backend tests
cd api && go test ./... -v -count=1

# Frontend tests
cd web && npx vitest run

# Linting
cd api && golangci-lint run
cd web && npx tsc --noEmit
```

## Project Structure

```
ITSecBase/
├── api/                    # Go backend
│   ├── cmd/server/         # Entry point
│   └── internal/
│       ├── auth/           # JWT, RBAC, password policy, TOTP
│       ├── config/         # Environment configuration
│       ├── database/       # DB connection, migrations (9 files)
│       ├── graph/          # GraphQL schema, resolvers, generated models
│       ├── handler/        # HTTP handlers (file upload)
│       ├── middleware/     # Rate limiting, tenant isolation, tracing, logging
│       ├── model/          # Domain models
│       ├── repository/     # Data access layer
│       └── telemetry/      # OpenTelemetry setup
├── web/                    # React frontend
│   └── src/
│       ├── components/     # Auth, common, layout components
│       ├── pages/          # Asset, vulnerability, GRC, admin pages
│       ├── hooks/          # React hooks (pagination, etc.)
│       └── relay/          # Relay environment & queries
├── docker/                 # Dockerfiles, nginx.conf, otel config
├── .github/workflows/      # CI/CD pipeline
├── docker-compose.yml
└── Makefile
```

## Security Features

- **Multi-tenancy**: PostgreSQL Row-Level Security isolates all data per organisation
- **Authentication**: JWT access/refresh tokens with Argon2id password hashing
- **RBAC**: Role-based access control (admin, analyst, viewer) on sensitive mutations
- **Rate Limiting**: Per-IP token bucket rate limiting on all endpoints
- **Password Policy**: Minimum 10 characters with uppercase, lowercase, digit, and special character requirements
- **CORS**: Configurable allowed origins via environment variable
- **2FA**: TOTP-based two-factor authentication support

## Environment Variables

| Variable                  | Default                      | Description                          |
|--------------------------|------------------------------|--------------------------------------|
| `POSTGRES_HOST`          | `localhost`                  | Database host                        |
| `POSTGRES_PORT`          | `5432`                       | Database port                        |
| `POSTGRES_USER`          | `secbase`                    | Database user                        |
| `POSTGRES_PASSWORD`      | `changeme_in_production`     | Database password                    |
| `POSTGRES_DB`            | `secbase`                    | Database name                        |
| `JWT_SECRET`             | `changeme_generate_a_64...`  | JWT signing secret                   |
| `JWT_ACCESS_TOKEN_EXPIRY`| `15m`                        | Access token lifetime                |
| `JWT_REFRESH_TOKEN_EXPIRY`| `168h`                      | Refresh token lifetime (7 days)      |
| `API_PORT`               | `8080`                       | API server port                      |
| `CORS_ORIGINS`           | `http://localhost:3000,...`   | Comma-separated allowed origins      |
| `RATE_LIMIT_RPS`         | `100`                        | Requests per second per IP           |
| `RATE_LIMIT_BURST`       | `200`                        | Maximum burst size per IP            |
| `UPLOAD_DIR`             | `uploads`                    | File upload directory                |

## License

Proprietary - All rights reserved.
