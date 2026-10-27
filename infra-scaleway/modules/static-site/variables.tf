variable "bucket_name" {
  description = "Nom du bucket (unique dans toute la région)"
  type        = string
}

variable "domain" {
  description = "Domaine du site (ex. app.example.com). null = pas de CDN, URL du bucket uniquement."
  type        = string
  default     = null
}

variable "writer_application_ids" {
  description = "Applications IAM qui gèrent le bucket (CI infra, déploiement du front)"
  type        = list(string)
}

variable "tags" {
  description = "Tags au format clé:valeur"
  type        = list(string)
  default     = []
}
