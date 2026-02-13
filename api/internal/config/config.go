package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Postgres    PostgresConfig
	JWT         JWTConfig
	API         APIConfig
	OTel        OTelConfig
	RateLimit   RateLimitConfig
	CORSOrigins []string
	UploadDir   string
}

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

func (p PostgresConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		p.User, p.Password, p.Host, p.Port, p.DBName)
}

type JWTConfig struct {
	Secret             string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

type APIConfig struct {
	Host string
	Port string
}

func (a APIConfig) Addr() string {
	return a.Host + ":" + a.Port
}

type OTelConfig struct {
	Endpoint    string
	ServiceName string
}

type RateLimitConfig struct {
	RPS   float64
	Burst int
}

func Load() (*Config, error) {
	accessExpiry, err := time.ParseDuration(getEnv("JWT_ACCESS_TOKEN_EXPIRY", "15m"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_TOKEN_EXPIRY: %w", err)
	}

	refreshExpiry, err := time.ParseDuration(getEnv("JWT_REFRESH_TOKEN_EXPIRY", "168h"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_TOKEN_EXPIRY: %w", err)
	}

	rps := getEnvFloat("RATE_LIMIT_RPS", 100)
	burst := getEnvInt("RATE_LIMIT_BURST", 200)

	corsOrigins := strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"), ",")
	for i := range corsOrigins {
		corsOrigins[i] = strings.TrimSpace(corsOrigins[i])
	}

	return &Config{
		Postgres: PostgresConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			User:     getEnv("POSTGRES_USER", "secbase"),
			Password: getEnv("POSTGRES_PASSWORD", "changeme_in_production"),
			DBName:   getEnv("POSTGRES_DB", "secbase"),
		},
		JWT: JWTConfig{
			Secret:             getEnv("JWT_SECRET", "changeme_generate_a_64_char_random_string"),
			AccessTokenExpiry:  accessExpiry,
			RefreshTokenExpiry: refreshExpiry,
		},
		API: APIConfig{
			Host: getEnv("API_HOST", "0.0.0.0"),
			Port: getEnv("API_PORT", "8080"),
		},
		OTel: OTelConfig{
			Endpoint:    getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
			ServiceName: getEnv("OTEL_SERVICE_NAME", "secbase-api"),
		},
		RateLimit: RateLimitConfig{
			RPS:   rps,
			Burst: burst,
		},
		CORSOrigins: corsOrigins,
		UploadDir:   getEnv("UPLOAD_DIR", "uploads"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvFloat(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}
