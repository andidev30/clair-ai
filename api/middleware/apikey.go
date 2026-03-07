package middleware

import (
	"github.com/andidev30/clair-ai/api/config"
	"github.com/gofiber/fiber/v2"
)

func APIKeyProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := c.Get("X-API-Key")
		if key == "" || key != config.AppConfig.InternalAPIKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
			})
		}
		return c.Next()
	}
}
