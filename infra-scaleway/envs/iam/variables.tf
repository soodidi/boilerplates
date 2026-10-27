variable "project" {
  description = "Nom court du projet (minuscules, chiffres, tirets)"
  type        = string
}

variable "project_id" {
  description = "ID du projet Scaleway"
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

