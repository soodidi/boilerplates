variable "name" {
  type = string
}

variable "description" {
  type = string
}

variable "project_id" {
  description = "Seul projet sur lequel la clé a des droits"
  type        = string
}

variable "permission_set_names" {
  description = "Droits accordés sur le projet (moindre privilège, OPS-006)"
  type        = list(string)
}

variable "tags" {
  type    = list(string)
  default = []
}
