output "ci_access_key" {
  description = "Secret SCW_ACCESS_KEY des environnements staging et production du repo infra (apply)"
  value       = module.ci.access_key
}

output "ci_secret_key" {
  description = "Secret SCW_SECRET_KEY des environnements staging et production du repo infra (apply)"
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

# Lus par staging et production pour autoriser l'écriture dans le bucket du front (bucket policy).
output "web_bucket_application_ids" {
  description = "Applications IAM citées dans la bucket policy du front : CI infra, plans des PR, deploy-web"
  value       = [module.ci.application_id, module.ci_plan.application_id, module.deploy["web"].application_id]
}

output "ci_plan_access_key" {
  description = "SCW_ACCESS_KEY des environnements GitHub staging-plan et production-plan (repo infra)"
  value       = module.ci_plan.access_key
}

output "ci_plan_secret_key" {
  description = "SCW_SECRET_KEY des environnements GitHub staging-plan et production-plan (repo infra)"
  value       = module.ci_plan.secret_key
  sensitive   = true
}
