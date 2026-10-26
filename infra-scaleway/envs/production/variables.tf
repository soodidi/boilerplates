variable "project" {
  description = "Nom court du projet (minuscules, chiffres, tirets)"
  type        = string
}

variable "api_image" {
  description = "Première image de l'API (poussée par la CI avant le premier apply). Ensuite gérée par la CI."
  type        = string
}

variable "web_domain" {
  description = "Domaine du front (ex. app.example.com) ; null = URL du bucket"
  type        = string
  default     = null
}

variable "web_origin" {
  description = "Origine(s) du front autorisée(s) par CORS, séparées par des virgules (BE-006)"
  type        = string
}

variable "api_sentry_dsn" {
  description = "DSN Sentry de l'API (public par nature)"
  type        = string
  default     = ""
}
