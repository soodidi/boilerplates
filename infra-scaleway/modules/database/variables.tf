variable "name" {
  type = string
}

variable "private_network_id" {
  description = "Réseau privé sur lequel exposer la base (aucun endpoint public)"
  type        = string
}

variable "engine" {
  description = "Version de PostgreSQL : la même en local (compose.yaml), en test et ici (OPS-004)"
  type        = string
  default     = "PostgreSQL-17"
}

variable "node_type" {
  description = "Gabarit de l'instance, ex. DB-DEV-S (staging), DB-PRO2-XXS (production)"
  type        = string
}

variable "high_availability" {
  type    = bool
  default = false
}

variable "volume_size_gb" {
  type    = number
  default = 10
}

variable "backup_retention_days" {
  description = "OPS-007 : au moins 7 jours en production"
  type        = number
  default     = 7
}

variable "database_name" {
  type    = string
  default = "app"
}

variable "app_user" {
  type    = string
  default = "app"
}

variable "tags" {
  type    = list(string)
  default = []
}
