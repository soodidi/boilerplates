variable "project" {
  description = "Nom court du projet (minuscules, chiffres, tirets)"
  type        = string
}

variable "api_image" {
  description = "Première image de l'API (poussée par la CI avant le premier apply). Ensuite gérée par la CI."
  type        = string
}

variable "web_domain" {
  description = "Domaine du front (ex. staging.app.example.com) ; null = URL du bucket"
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


variable "mail_from" {
  description = "Expéditeur des e-mails, sur le domaine d'envoi (ex. Mon app <noreply@mail.example.com>)"
  type        = string
}

variable "mail_allowed_recipients" {
  description = "Seules adresses qui reçoivent des e-mails en staging, séparées par des virgules (BE-009)"
  type        = string

  validation {
    condition     = length(trimspace(var.mail_allowed_recipients)) > 0
    error_message = "En staging, au moins une adresse autorisée : jamais d'e-mail à de vrais utilisateurs."
  }
}

variable "api_url" {
  description = "URL publique de l'API (ex. https://api.staging.app.example.com). Même domaine que le front, sinon le cookie de session n'est pas envoyé (BE-006)"
  type        = string
}

variable "app_name" {
  description = "Nom de l'app affiché dans les e-mails (BE-009)"
  type        = string
}

variable "state_passphrase" {
  description = "Passphrase de chiffrement du state (16 caractères au moins), commune à tous les environnements"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.state_passphrase) >= 16
    error_message = "La passphrase du state doit faire au moins 16 caractères."
  }
}

variable "admin_emails" {
  description = "Adresses promues admin au démarrage de l'API, séparées par des virgules, 5 au plus (BE-010). Le compte doit s'être inscrit et avoir confirmé son adresse. Toute modification passe par une PR ; le repo infra doit rester privé"
  type        = string
  default     = ""
  sensitive   = true # Données personnelles : masquées dans les plans affichés par la CI (GLB-013), mais en clair dans le repo.

  # Même règle que l'API (`z.email()`, env.ts) : une adresse acceptée ici et refusée par l'API
  # empêcherait le conteneur de démarrer.
  validation {
    condition = length(distinct(compact([for e in split(",", var.admin_emails) : lower(trimspace(e))]))) <= 5 && alltrue([
      for email in compact([for e in split(",", var.admin_emails) : trimspace(e)]) :
      can(regex("^([A-Za-z0-9_'+-]+\\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\\.)+[A-Za-z]{2,}$", email))
    ])
    error_message = "admin_emails : 5 adresses e-mail valides au plus, séparées par des virgules."
  }
}
