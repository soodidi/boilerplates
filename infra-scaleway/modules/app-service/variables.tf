variable "name" {
  type = string
}

variable "image" {
  description = "Image initiale (ex. rg.fr-par.scw.cloud/mon-projet/api:<sha>). Ensuite gérée par la CI."
  type        = string
}

variable "port" {
  type    = number
  default = 3000
}

variable "private_network_id" {
  type = string
}

variable "cpu_limit" {
  description = "En mvCPU (1000 = 1 vCPU)"
  type        = number
  default     = 500
}

variable "memory_limit_bytes" {
  type    = number
  default = 1073741824
}

variable "min_scale" {
  description = "0 hors production pour ne rien payer au repos (scale to zero)"
  type        = number
  default     = 0
}

variable "max_scale" {
  type    = number
  default = 3
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "secret_environment_variables" {
  description = "Chiffrées par la plateforme, jamais affichées (OPS-006)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "tags" {
  type    = list(string)
  default = []
}

variable "domain" {
  description = "Domaine de l'API (ex. api.app.example.com) ; null = URL Scaleway uniquement"
  type        = string
  default     = null
}
