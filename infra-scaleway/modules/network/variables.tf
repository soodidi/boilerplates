variable "name" {
  description = "Nom du VPC et du réseau privé"
  type        = string
}

variable "tags" {
  description = "Tags appliqués aux ressources (OPS-003)"
  type        = list(string)
  default     = []
}
