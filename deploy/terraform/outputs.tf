output "api_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "URL of the API service"
}

output "ai_url" {
  value       = google_cloud_run_v2_service.ai.uri
  description = "URL of the AI service"
}

output "ui_url" {
  value       = google_cloud_run_v2_service.ui.uri
  description = "URL of the UI service"
}
