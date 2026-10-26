output "api_url" {
  value = module.api.url
}

output "api_container_id" {
  description = "Variable CONTAINER_ID de l'environnement GitHub `staging` (repo API)"
  value       = module.api.container_id
}

output "web_bucket" {
  description = "Variable BUCKET de l'environnement GitHub `staging` (repo web)"
  value       = module.web.bucket_name
}

output "web_url" {
  value = module.web.website_url
}

output "database_url" {
  description = "Secret DATABASE_URL de l'environnement GitHub `staging` (job de migration)"
  value       = module.database.database_url
  sensitive   = true
}
