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

variable "mail_domain" {
  description = "Domaine d'envoi créé par envs/shared (BE-009)"
  type        = string
}

variable "mail_from" {
  description = "Expéditeur des e-mails, sur le domaine d'envoi (ex. Mon app <noreply@mail.example.com>)"
  type        = string
}

variable "api_url" {
  description = "URL publique de l'API (ex. https://api.app.example.com). Même domaine que le front, sinon le cookie de session n'est pas envoyé (BE-006)"
  type        = string
}

variable "app_name" {
  description = "Nom de l'app affiché dans les e-mails (BE-009)"
  type        = string
}
