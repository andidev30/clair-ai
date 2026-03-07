terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Firestore (MongoDB compatibility mode)
resource "google_firestore_database" "main" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Run - API Service
resource "google_cloud_run_v2_service" "api" {
  name     = "clair-api"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/clair-api"
      ports {
        container_port = 3000
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
      env {
        name  = "INTERNAL_API_KEY"
        value = var.internal_api_key
      }
      env {
        name  = "MONGO_URI"
        value = "mongodb+srv://${google_firestore_database.main.name}.firestore.googleapis.com:443/clair_ai?authMechanism=PLAIN"
      }
    }
  }
}

# Cloud Run - AI Service
resource "google_cloud_run_v2_service" "ai" {
  name     = "clair-ai"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/clair-ai"
      ports {
        container_port = 8001
      }
      resources {
        limits = {
          memory = "1Gi"
          cpu    = "2"
        }
      }
      env {
        name  = "PORT"
        value = "8001"
      }
      env {
        name  = "GOOGLE_API_KEY"
        value = var.google_api_key
      }
      env {
        name  = "INTERNAL_API_KEY"
        value = var.internal_api_key
      }
      env {
        name  = "GOLANG_BACKEND_URL"
        value = google_cloud_run_v2_service.api.uri
      }
    }
    timeout = "3600s"
  }
}

# Cloud Run - UI Service
resource "google_cloud_run_v2_service" "ui" {
  name     = "clair-ui"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/clair-ui"
      ports {
        container_port = 8080
      }
    }
  }
}

# IAM - Allow unauthenticated access
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ai_public" {
  name     = google_cloud_run_v2_service.ai.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ui_public" {
  name     = google_cloud_run_v2_service.ui.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
