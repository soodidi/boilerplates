output "ci_access_key" {
  description = "Secret SCW_ACCESS_KEY des environnements GitHub (repos infra, API, web)"
  value       = module.ci.access_key
}

output "ci_secret_key" {
  description = "Secret SCW_SECRET_KEY des environnements GitHub (repos infra, API, web)"
  value       = module.ci.secret_key
  sensitive   = true
}

# BE-009 : lu par envs/staging et envs/production (terraform_remote_state), jamais recopié à la main.
output "smtp_urls" {
  description = "SMTP_URL de l'API par environnement : ID du projet et clé secrète, STARTTLS sur le port 587"
  value = {
    for env, key in module.smtp :
    env => format("smtp://%s:%s@smtp.tem.scaleway.com:587", urlencode(var.project_id), urlencode(key.secret_key))
  }
  sensitive = true
}
