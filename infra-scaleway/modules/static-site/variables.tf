variable "bucket_name" {
  description = "Nom du bucket (unique dans toute la région)"
  type        = string
}

variable "domain" {
  description = "Domaine du site (ex. app.example.com). null = pas de CDN, URL du bucket uniquement."
  type        = string
  default     = null
}

variable "bucket_application_ids" {
  description = "Applications IAM qui accèdent au bucket : CI infra (apply), plans des PR (lecture), déploiement du front"
  type        = list(string)
}

variable "tags" {
  description = "Tags au format clé:valeur"
  type        = list(string)
  default     = []
}
