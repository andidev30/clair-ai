package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	GoogleClientID string
	JWTSecret      string
	MongoURI       string
	Port           string
	InternalAPIKey string
	AllowedOrigins string
}

var AppConfig Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	AppConfig = Config{
		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
		JWTSecret:      getEnv("JWT_SECRET", "clair-ai-dev-secret"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017/clair_ai"),
		Port:           getEnv("PORT", "3000"),
		InternalAPIKey: getEnv("INTERNAL_API_KEY", "clair-ai-dev-key"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
