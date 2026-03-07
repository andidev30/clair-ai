package handlers

import (
	"context"
	"time"

	"github.com/andidev30/clair-ai/api/config"
	"github.com/andidev30/clair-ai/api/database"
	"github.com/andidev30/clair-ai/api/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/v2/bson"
	"google.golang.org/api/idtoken"
)

type GoogleLoginRequest struct {
	Credential string `json:"credential"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func GoogleLogin(c *fiber.Ctx) error {
	var req GoogleLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Credential == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Credential is required"})
	}

	// Validate Google ID token
	payload, err := idtoken.Validate(context.Background(), req.Credential, config.AppConfig.GoogleClientID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid Google token"})
	}

	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	if email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email not found in token"})
	}

	// Upsert user
	now := time.Now()
	col := database.DB.Collection("users")

	var user models.User
	err = col.FindOne(context.Background(), bson.M{"email": email}).Decode(&user)

	if err != nil {
		// Create new user
		user = models.User{
			ID:        uuid.New().String(),
			Email:     email,
			Fullname:  name,
			Picture:   picture,
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, err = col.InsertOne(context.Background(), user)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
		}
	} else {
		// Update existing user
		update := bson.M{
			"$set": bson.M{
				"fullname":   name,
				"picture":    picture,
				"updated_at": now,
			},
		}
		_, err = col.UpdateOne(context.Background(), bson.M{"_id": user.ID}, update)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
		}
		user.Fullname = name
		user.Picture = picture
		user.UpdatedAt = now
	}

	// Sign JWT
	token, err := signJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(LoginResponse{Token: token, User: user})
}

func signJWT(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GetUserIDFromToken extracts the user ID from JWT claims stored in Fiber context
func GetUserIDFromToken(c *fiber.Ctx) string {
	token := c.Locals("user").(*jwt.Token)
	claims := token.Claims.(jwt.MapClaims)
	return claims["sub"].(string)
}

// RefreshToken returns a new JWT with extended expiry. Called on GET /api/auth/refresh.
func RefreshToken(c *fiber.Ctx) error {
	userID := GetUserIDFromToken(c)

	col := database.DB.Collection("users")
	var user models.User
	if err := col.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	token, err := signJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(LoginResponse{Token: token, User: user})
}