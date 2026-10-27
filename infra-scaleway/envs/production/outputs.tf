output "api_url" {
  value = module.api.url
}

output "api_container_id" {
  description = "Variable CONTAINER_ID de l'environnement GitHub `production` (repo API)"
  value       = module.api.container_id
}

output "web_bucket" {
  description = "Variable BUCKET de l'environnement GitHub `production` (repo web)"
  value       = module.web.bucket_name
}

output "web_url" {
  value = module.web.website_url
}

output "database_url" {
  description = "URL de la base (réseau privé) : intervention manuelle uniquement, les migrations tournent dans l'API"
  value       = module.database.database_url
  sensitive   = true
}

output "api_dns_target" {
  description = "CNAME à créer : domaine de l'API → cette valeur (avant l'apply qui crée le domaine)"
  value       = module.api.dns_target
}
