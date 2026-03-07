package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/andidev30/clair-ai/api/database"
	"github.com/andidev30/clair-ai/api/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func generateToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to uuid if crypto/rand fails
		return uuid.New().String()
	}
	return hex.EncodeToString(b)
}

func CreateSession(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	interviewID := c.Params("id")

	// Verify interview belongs to user
	interviewCol := database.DB.Collection("interviews")
	var interview models.Interview
	if err := interviewCol.FindOne(context.Background(), bson.M{"_id": interviewID, "user_id": userID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Interview not found"})
	}

	now := time.Now()
	session := models.Session{
		ID:          uuid.New().String(),
		InterviewID: interviewID,
		Status:      "pending",
		Token:       generateToken(),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	col := database.DB.Collection("sessions")
	if _, err := col.InsertOne(context.Background(), session); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create session"})
	}

	return c.Status(fiber.StatusCreated).JSON(session)
}

func ListSessions(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	interviewID := c.Params("id")

	// Verify interview belongs to user
	interviewCol := database.DB.Collection("interviews")
	var interview models.Interview
	if err := interviewCol.FindOne(context.Background(), bson.M{"_id": interviewID, "user_id": userID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Interview not found"})
	}

	col := database.DB.Collection("sessions")
	cursor, err := col.Find(context.Background(), bson.M{"interview_id": interviewID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch sessions"})
	}

	var sessions []models.Session
	if err := cursor.All(context.Background(), &sessions); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode sessions"})
	}

	if sessions == nil {
		sessions = []models.Session{}
	}

	return c.JSON(sessions)
}

func GetSession(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	id := c.Params("id")

	col := database.DB.Collection("sessions")
	var session models.Session
	if err := col.FindOne(context.Background(), bson.M{"_id": id}).Decode(&session); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	// Verify the interview belongs to user
	interviewCol := database.DB.Collection("interviews")
	var interview models.Interview
	if err := interviewCol.FindOne(context.Background(), bson.M{"_id": session.InterviewID, "user_id": userID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Session not found"})
	}

	return c.JSON(session)
}

// JoinSession is a public endpoint (no auth) for candidates to join via token
func JoinSession(c *fiber.Ctx) error {
	token := c.Params("token")

	col := database.DB.Collection("sessions")
	var session models.Session
	if err := col.FindOne(context.Background(), bson.M{"token": token}).Decode(&session); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid interview link"})
	}

	if session.Status == "completed" {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "This interview session has already been completed"})
	}

	// Get interview config
	interviewCol := database.DB.Collection("interviews")
	var interview models.Interview
	if err := interviewCol.FindOne(context.Background(), bson.M{"_id": session.InterviewID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load interview config"})
	}

	// Mark as in_progress if pending
	if session.Status == "pending" {
		now := time.Now()
		col.UpdateOne(context.Background(), bson.M{"_id": session.ID}, bson.M{
			"$set": bson.M{"status": "in_progress", "started_at": now, "updated_at": now},
		})
		session.Status = "in_progress"
		session.StartedAt = &now
	}

	return c.JSON(models.SessionWithInterview{
		Session:   session,
		Interview: interview,
	})
}
