# SecBase - Production Deployment Guide

## Docker Compose Deployment

### 1. Prepare Environment

```bash
cp .env.example .env
```

Edit `.env` with production values:

```env
# REQUIRED: Generate a strong random secret (64+ characters)
JWT_SECRET=$(openssl rand -hex 32)

# REQUIRED: Set a strong database password
POSTGRES_PASSWORD=<strong-random-password>

# REQUIRED: Set allowed frontend origins
CORS_ORIGINS=https://secbase.yourorganisation.com

# Optional: Adjust rate limits
RATE_LIMIT_RPS=100
RATE_LIMIT_BURST=200

# Optional: Adjust token lifetimes
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=168h
```

### 2. Start Services

```bash
# Core stack (API + Web + PostgreSQL)
docker compose up -d

# With observability (adds Jaeger tracing)
docker compose --profile observability up -d
```

### 3. Verify

```bash
# Check all services are healthy
docker compose ps

# Test health endpoint
curl http://localhost:8080/health
# Expected: {"status":"ok"}
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| web     | 3000 | Frontend (nginx) |
| api     | 8080 | GraphQL API |
| db      | 5432 | PostgreSQL (not exposed externally by default) |
| jaeger  | 16686 | Jaeger UI (observability profile only) |

## Production Checklist

### Security

- [ ] Generate a unique `JWT_SECRET` (minimum 64 random characters)
- [ ] Set a strong `POSTGRES_PASSWORD`
- [ ] Configure `CORS_ORIGINS` to only allow your frontend domain
- [ ] Place the API behind a reverse proxy with TLS termination
- [ ] Do not expose PostgreSQL port externally
- [ ] Do not expose the GraphQL playground in production (remove or guard the `/` route)
- [ ] Review rate limiting settings (`RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`)
- [ ] Ensure the default admin password is changed after first login

### Database

- [ ] Configure PostgreSQL backups (pg_dump or continuous archiving)
- [ ] Set appropriate connection pool limits
- [ ] Enable SSL connections to PostgreSQL
- [ ] Monitor disk space for the database volume

### Networking

- [ ] Set up TLS/HTTPS via reverse proxy (nginx, Caddy, or cloud load balancer)
- [ ] Configure DNS for your domain
- [ ] Set up health check monitoring on `/health`

### Monitoring

- [ ] Enable the observability profile for distributed tracing
- [ ] Set up log aggregation for container logs
- [ ] Configure alerting on health check failures
- [ ] Monitor API response times and error rates

## Reverse Proxy Configuration

### nginx (example)

```nginx
server {
    listen 443 ssl http2;
    server_name secbase.yourorganisation.com;

    ssl_certificate     /etc/ssl/certs/secbase.crt;
    ssl_certificate_key /etc/ssl/private/secbase.key;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /graphql {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }

    location /api/upload {
        proxy_pass http://127.0.0.1:8080;
        client_max_body_size 50m;
    }
}
```

## Updating

```bash
# Pull latest images / rebuild
docker compose build

# Apply update with zero-downtime restart
docker compose up -d

# Database migrations run automatically on API startup
```

## Backup & Restore

### Backup

```bash
# Database backup
docker compose exec db pg_dump -U secbase secbase > backup_$(date +%Y%m%d).sql

# Full volume backup
docker compose stop db
docker run --rm -v itsecbase_pgdata:/data -v $(pwd):/backup alpine \
  tar czf /backup/pgdata_$(date +%Y%m%d).tar.gz /data
docker compose start db
```

### Restore

```bash
# From SQL dump
docker compose exec -T db psql -U secbase secbase < backup_20250101.sql
```

## Troubleshooting

### API won't start

```bash
# Check logs
docker compose logs api

# Common issues:
# - Database not ready yet (API retries are built-in)
# - Invalid JWT_SECRET format
# - Migration failures (check migration SQL syntax)
```

### Database connection issues

```bash
# Verify database is healthy
docker compose exec db pg_isready -U secbase

# Check connection from API container
docker compose exec api sh -c 'nc -zv db 5432'
```

### Frontend not loading

```bash
# Check nginx logs
docker compose logs web

# Verify API is reachable from the web container
docker compose exec web sh -c 'wget -qO- http://api:8080/health'
```
