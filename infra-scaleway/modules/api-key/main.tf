terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
  }
}

# OPS-006 : une application IAM par usage, avec une clé API limitée au projet
# et aux seuls droits nécessaires. Ressources d'organisation : appliqué depuis envs/iam.
resource "scaleway_iam_application" "this" {
  name        = var.name
  description = var.description
  tags        = var.tags
}

resource "scaleway_iam_policy" "this" {
  name           = var.name
  description    = var.description
  application_id = scaleway_iam_application.this.id
  tags           = var.tags

  rule {
    project_ids          = [var.project_id]
    permission_set_names = var.permission_set_names
  }
}

resource "scaleway_iam_api_key" "this" {
  application_id     = scaleway_iam_application.this.id
  description        = var.description
  default_project_id = var.project_id
}
