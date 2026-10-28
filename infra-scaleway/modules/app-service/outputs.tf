output "container_id" {
  description = "À renseigner dans la variable CONTAINER_ID de l'environnement GitHub (déploiement)"
  # L'ID OpenTofu est régional (`fr-par/<uuid>`) ; la CLI Scaleway attend l'UUID seul.
  value = element(split("/", scaleway_container.this.id), 1)
}

output "url" {
  value = scaleway_container.this.public_endpoint
}

output "dns_target" {
  description = "Cible du CNAME du domaine de l'API, à créer chez le registrar"
  value       = trimsuffix(replace(scaleway_container.this.public_endpoint, "/^https?:\\/\\//", ""), "/")
}
