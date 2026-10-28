output "database_url" {
  # `uselibpqcompat` : sémantique libpq de `require` (chiffré, certificat non vérifié). Sans lui,
  # `pg` traite `require` comme `verify-full` et refuse le certificat de Scaleway, présenté pour une IP.
  # Le trafic reste dans le réseau privé ; passer à `verify-ca` avec le certificat de l'instance si besoin.
  description = "URL de connexion de l'application (réseau privé, TLS)"
  value = format(
    "postgres://%s:%s@%s:%d/%s?sslmode=require&uselibpqcompat=true",
    scaleway_rdb_user.app.name,
    urlencode(random_password.app.result),
    scaleway_rdb_instance.this.private_network[0].ip,
    scaleway_rdb_instance.this.private_network[0].port,
    # Via le privilège : l'URL n'existe qu'une fois les droits de `app` accordés, et le conteneur
    # (qui migre au démarrage) ne démarre donc jamais avant (un nouvel utilisateur n'a aucun droit).
    scaleway_rdb_privilege.app.database_name,
  )
  sensitive = true
}

output "instance_id" {
  value = scaleway_rdb_instance.this.id
}
