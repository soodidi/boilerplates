variable "bucket_name" {
  description = "Nom du bucket (unique dans toute la région)"
  type        = string
}

variable "domain" {
  description = "Domaine du site (ex. app.example.com). null = pas de CDN, URL du bucket uniquement."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags au format clé:valeur"
  type        = list(string)
  default     = []
}
