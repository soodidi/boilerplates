variable "name" {
  type = string
}

variable "domain" {
  description = "Domaine d'envoi déclaré dans Scaleway TEM par envs/shared (ex. mail.example.com)"
  type        = string
}
