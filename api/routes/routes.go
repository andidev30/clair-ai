package routes

import (
	"github.com/andidev30/clair-ai/api/handlers"
	"github.com/andidev30/clair-ai/api/middleware"
	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App) {
	api := app.Group("/api")

	// Public routes
	auth := api.Group("/auth")
	auth.Post("/google", handlers.GoogleLogin)

	// Protected routes
	protected := api.Group("", middleware.JWTProtected())

	// Auth refresh (protected)
	protected.Get("/auth/refresh", handlers.RefreshToken)

	// Users
	protected.Get("/users/me", handlers.GetMe)

	// Interviews
	interviews := protected.Group("/interviews")
	interviews.Get("/", handlers.ListInterviews)
	interviews.Post("/", handlers.CreateInterview)
	interviews.Get("/:id", handlers.GetInterview)
	interviews.Put("/:id", handlers.UpdateInterview)
	interviews.Delete("/:id", handlers.DeleteInterview)
}
