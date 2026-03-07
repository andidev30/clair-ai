variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "google_api_key" {
  description = "Gemini API key"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Internal API key for service-to-service auth"
  type        = string
  sensitive   = true
}
