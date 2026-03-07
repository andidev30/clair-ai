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

func ListInterviews(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	col := database.DB.Collection("interviews")

	cursor, err := col.Find(context.Background(), bson.M{"user_id": userID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch interviews"})
	}

	var interviews []models.Interview
	if err := cursor.All(context.Background(), &interviews); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode interviews"})
	}

	if interviews == nil {
		interviews = []models.Interview{}
	}

	return c.JSON(interviews)
}

func GetInterview(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	id := c.Params("id")

	col := database.DB.Collection("interviews")
	var interview models.Interview
	if err := col.FindOne(context.Background(), bson.M{"_id": id, "user_id": userID}).Decode(&interview); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Interview not found"})
	}

	return c.JSON(interview)
}

func CreateInterview(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)

	var input models.CreateInterviewInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Title is required"})
	}
	if input.Level == "" {
		input.Level = "junior"
	}

	now := time.Now()
	interview := models.Interview{
		ID:            uuid.New().String(),
		UserID:        userID,
		Title:         input.Title,
		CandidateName: input.CandidateName,
		Position:      input.Position,
		Level:         input.Level,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	col := database.DB.Collection("interviews")
	_, err := col.InsertOne(context.Background(), interview)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create interview"})
	}

	return c.Status(fiber.StatusCreated).JSON(interview)
}

func UpdateInterview(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	id := c.Params("id")

	col := database.DB.Collection("interviews")

	var existing models.Interview
	if err := col.FindOne(context.Background(), bson.M{"_id": id, "user_id": userID}).Decode(&existing); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Interview not found"})
	}

	var input models.UpdateInterviewInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	update := bson.M{"updated_at": time.Now()}

	if input.Title != nil {
		update["title"] = *input.Title
	}
	if input.CandidateName != nil {
		update["candidate_name"] = *input.CandidateName
	}
	if input.Position != nil {
		update["position"] = *input.Position
	}
	if input.Level != nil {
		update["level"] = *input.Level
	}

	_, err := col.UpdateOne(context.Background(), bson.M{"_id": id}, bson.M{"$set": update})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update interview"})
	}

	var updated models.Interview
	col.FindOne(context.Background(), bson.M{"_id": id}).Decode(&updated)

	return c.JSON(updated)
}

func DeleteInterview(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)
	id := c.Params("id")

	col := database.DB.Collection("interviews")
	result, err := col.DeleteOne(context.Background(), bson.M{"_id": id, "user_id": userID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete interview"})
	}

	if result.DeletedCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Interview not found"})
	}

	return c.JSON(fiber.Map{"message": "Interview deleted"})
}
