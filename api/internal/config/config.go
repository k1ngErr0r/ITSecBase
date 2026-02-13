package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Postgres  PostgresConfig
	JWT       JWTConfig
	API       APIConfig
	OTel      OTelConfig
	UploadDir string
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

func Load() (*Config, error) {
	accessExpiry, err := time.ParseDuration(getEnv("JWT_ACCESS_TOKEN_EXPIRY", "15m"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_TOKEN_EXPIRY: %w", err)
	}

	refreshExpiry, err := time.ParseDuration(getEnv("JWT_REFRESH_TOKEN_EXPIRY", "168h"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_TOKEN_EXPIRY: %w", err)
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
		UploadDir: getEnv("UPLOAD_DIR", "uploads"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
