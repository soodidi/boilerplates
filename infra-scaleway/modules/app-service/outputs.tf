output "container_id" {
  description = "À renseigner dans la variable CONTAINER_ID de l'environnement GitHub (déploiement)"
  value       = scaleway_container.this.id
}

output "url" {
  value = scaleway_container.this.public_endpoint
}
