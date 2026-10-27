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

variable "state_passphrase" {
  description = "Passphrase de chiffrement du state (16 caractères au moins), commune à tous les environnements"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.state_passphrase) >= 16
    error_message = "La passphrase du state doit faire au moins 16 caractères."
  }
}
