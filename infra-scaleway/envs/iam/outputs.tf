output "ci_access_key" {
  description = "Secret SCW_ACCESS_KEY des environnements GitHub du repo infra uniquement"
  value       = module.ci.access_key
}

output "ci_secret_key" {
  description = "Secret SCW_SECRET_KEY des environnements GitHub du repo infra uniquement"
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

output "deploy_access_keys" {
  description = "SCW_ACCESS_KEY des repos applicatifs : deploy_access_keys[\"web\"] pour le web, [\"api\"] pour l'API"
  value       = { for repo, key in module.deploy : repo => key.access_key }
}

output "deploy_secret_keys" {
  description = "SCW_SECRET_KEY des repos applicatifs (même clé que deploy_access_keys)"
  value       = { for repo, key in module.deploy : repo => key.secret_key }
  sensitive   = true
}
