variable "project" {
  description = "Nom court du projet (minuscules, chiffres, tirets)"
  type        = string
}

variable "mail_domain" {
  description = "Sous-domaine d'envoi des e-mails (ex. mail.example.com), BE-009"
  type        = string
}

variable "mail_dns_autoconfig" {
  description = "true si la zone DNS est chez Scaleway (enregistrements créés automatiquement)"
  type        = bool
  default     = false
}
