package handlers

import (
	"context"

	"github.com/andidev30/clair-ai/api/database"
	"github.com/andidev30/clair-ai/api/models"
	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func GetResult(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	sessionID := c.Params("id")

	// Verify session belongs to user's interview
	sessionCol := database.DB.Collection("sessions")
	var session models.Session
	if err := sessionCol.FindOne(context.Background(), bson.M{"_id": sessionID}).Decode(&session); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	interviewCol := database.DB.Collection("interviews")
	var interview models.Interview
	if err := interviewCol.FindOne(context.Background(), bson.M{"_id": session.InterviewID, "user_id": userID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	resultCol := database.DB.Collection("results")
	var result models.InterviewResult
	if err := resultCol.FindOne(context.Background(), bson.M{"session_id": sessionID}).Decode(&result); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Result not found"})
	}

	return c.JSON(result)
}
