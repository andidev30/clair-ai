package handlers

import (
	"context"
	"time"

	"github.com/andidev30/clair-ai/api/database"
	"github.com/andidev30/clair-ai/api/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func ReceiveResult(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")

	// Verify session exists
	sessionCol := database.DB.Collection("sessions")
	var session models.Session
	if err := sessionCol.FindOne(context.Background(), bson.M{"_id": sessionID}).Decode(&session); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	// Check if result already exists for this session (prevent duplicates)
	resultCol := database.DB.Collection("results")
	var existing models.InterviewResult
	if err := resultCol.FindOne(context.Background(), bson.M{"session_id": sessionID}).Decode(&existing); err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Result already exists", "id": existing.ID})
	}

	var result models.InterviewResult
	if err := c.BodyParser(&result); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid result payload"})
	}

	result.ID = uuid.New().String()
	result.SessionID = sessionID
	result.CreatedAt = time.Now()

	if _, err := resultCol.InsertOne(context.Background(), result); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to store result"})
	}

	// Update session status to completed
	now := time.Now()
	sessionCol.UpdateOne(context.Background(), bson.M{"_id": sessionID}, bson.M{
		"$set": bson.M{"status": "completed", "completed_at": now, "updated_at": now},
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Result stored", "id": result.ID})
}
