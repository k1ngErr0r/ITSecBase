.PHONY: dev-api dev-web generate relay build lint test docker-up docker-down migrate clean check

# ─── Development ────────────────────────────────────────────────────────────

dev-api: ## Run API server in development mode
	cd api && go run ./cmd/server

dev-web: ## Run frontend dev server
	cd web && npm run dev

# ─── Code Generation ────────────────────────────────────────────────────────

generate: ## Run gqlgen code generation
	cd api && go run github.com/99designs/gqlgen generate

relay: ## Run Relay compiler
	cd web && npx relay-compiler

# ─── Build ──────────────────────────────────────────────────────────────────

build: build-api build-web ## Build API and frontend

build-api:
	cd api && go build -o bin/server ./cmd/server

build-web:
	cd web && npm run build

# ─── Quality ────────────────────────────────────────────────────────────────

lint: ## Run linters
	cd api && go vet ./...
	cd web && npx tsc --noEmit

test: test-api test-web ## Run all tests

test-api:
	cd api && go test ./...

test-web:
	cd web && npx vitest run

check: lint test ## Run linters and tests

# ─── Docker ─────────────────────────────────────────────────────────────────

docker-up: ## Start full stack via Docker Compose
	docker-compose up --build -d

docker-down: ## Stop Docker Compose
	docker-compose down

docker-up-otel: ## Start with observability stack (Jaeger + OTel)
	docker-compose --profile observability up --build -d

# ─── Database ───────────────────────────────────────────────────────────────

migrate: ## Run database migrations
	cd api && go run ./cmd/server migrate

# ─── Utilities ──────────────────────────────────────────────────────────────

clean: ## Clean build artifacts
	rm -rf api/bin web/dist web/src/__generated__

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
