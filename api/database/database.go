package database

import (
	"context"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/andidev30/clair-ai/api/config"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var DB *mongo.Database

func Connect() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(config.AppConfig.MongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	dbName := dbNameFromURI(config.AppConfig.MongoURI)
	DB = client.Database(dbName)
	log.Println("Connected to MongoDB:", dbName)
}

func dbNameFromURI(uri string) string {
	u, err := url.Parse(uri)
	if err != nil || u.Path == "" || u.Path == "/" {
		return "clair_ai"
	}
	return strings.TrimPrefix(u.Path, "/")
}

