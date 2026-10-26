output "database_url" {
  description = "URL de connexion de l'application (réseau privé, TLS)"
  value = format(
    "postgres://%s:%s@%s:%d/%s?sslmode=require",
    scaleway_rdb_user.app.name,
    urlencode(random_password.app.result),
    scaleway_rdb_instance.this.private_network[0].ip,
    scaleway_rdb_instance.this.private_network[0].port,
    scaleway_rdb_database.app.name,
  )
  sensitive = true
}

output "instance_id" {
  value = scaleway_rdb_instance.this.id
}
