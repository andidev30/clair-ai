package handlers

import (
	"context"

	"github.com/andidev30/clair-ai/api/database"
	"github.com/andidev30/clair-ai/api/models"
	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func GetMe(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)

	col := database.DB.Collection("users")
	var user models.User
	if err := col.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}
