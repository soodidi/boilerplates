terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
    random   = { source = "hashicorp/random" }
  }
}

resource "random_password" "admin" {
  length           = 32
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
  override_special = "-_"
}

resource "random_password" "app" {
  length           = 32
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
  override_special = "-_"
}

# OPS-005 : PostgreSQL managé, uniquement sur le réseau privé (pas d'endpoint public),
# chiffré, sauvegardé chaque jour. Haute disponibilité en production.
resource "scaleway_rdb_instance" "this" {
  name               = var.name
  node_type          = var.node_type
  engine             = var.engine
  is_ha_cluster      = var.high_availability
  volume_type        = "sbs_5k"
  volume_size_in_gb  = var.volume_size_gb
  encryption_at_rest = true

  disable_backup            = false
  backup_schedule_frequency = 24
  backup_schedule_retention = var.backup_retention_days
  # OPS-007 : copie des sauvegardes hors de la région de l'instance.
  backup_same_region = false

  user_name = "admin"
  password  = random_password.admin.result

  private_network {
    pn_id       = var.private_network_id
    enable_ipam = true
  }

  tags = var.tags
}

resource "scaleway_rdb_database" "app" {
  instance_id = scaleway_rdb_instance.this.id
  name        = var.database_name
}

# L'application utilise un utilisateur dédié, sans droits d'administration (OPS-006).
resource "scaleway_rdb_user" "app" {
  instance_id = scaleway_rdb_instance.this.id
  name        = var.app_user
  password    = random_password.app.result
  is_admin    = false
}

resource "scaleway_rdb_privilege" "app" {
  instance_id   = scaleway_rdb_instance.this.id
  user_name     = scaleway_rdb_user.app.name
  database_name = scaleway_rdb_database.app.name
  permission    = "all"
}
