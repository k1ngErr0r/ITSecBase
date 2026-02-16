# Build stage
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /build

COPY api/go.mod api/go.sum ./
RUN go mod download

COPY api/ .

RUN go run github.com/99designs/gqlgen generate
RUN CGO_ENABLED=0 GOOS=linux go build -o /build/bin/server ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /build/bin/server .
COPY --from=builder /build/internal/database/migrations ./migrations

EXPOSE 8080

ENTRYPOINT ["./server"]
