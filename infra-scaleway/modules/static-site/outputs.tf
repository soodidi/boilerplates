output "bucket_name" {
  description = "À renseigner dans la variable BUCKET de l'environnement GitHub (déploiement du front)"
  value       = scaleway_object_bucket.this.name
}

output "website_url" {
  value = "https://${scaleway_object_bucket_website_configuration.this.website_endpoint}"
}

output "dns_target" {
  description = "Cible du CNAME du domaine du front (Edge Services) ; null sans domaine"
  value       = var.domain == null ? null : scaleway_edge_services_dns_stage.this[0].default_fqdn
}
