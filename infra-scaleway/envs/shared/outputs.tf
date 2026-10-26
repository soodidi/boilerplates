output "registry_endpoint" {
  description = "Préfixe des images, à mettre dans la variable REGISTRY_IMAGE de l'API (…/api)"
  value       = scaleway_registry_namespace.this.endpoint
}
