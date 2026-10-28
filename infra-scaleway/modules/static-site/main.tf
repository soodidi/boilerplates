terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
  }
}

# OPS-005 : front statique (SPA) sur Object Storage.
resource "scaleway_object_bucket" "this" {
  name = var.bucket_name
  tags = { for tag in var.tags : split(":", tag)[0] => try(split(":", tag)[1], "true") }
}

resource "scaleway_object_bucket_website_configuration" "this" {
  bucket = scaleway_object_bucket.this.name

  index_document {
    suffix = "index.html"
  }

  # SPA : toutes les routes inconnues renvoient index.html, le router côté client prend le relais.
  error_document {
    key = "index.html"
  }
}

# Chez Scaleway, dès qu'une bucket policy existe, seuls les principaux qu'elle cite y ont accès,
# quels que soient leurs droits IAM : la CI infra, la clé des plans et celle du déploiement y sont
# listées. `s3:*` reste borné par l'IAM de chaque clé (policy ET IAM doivent autoriser l'action).
resource "scaleway_object_bucket_policy" "public_read" {
  bucket = scaleway_object_bucket.this.name
  policy = jsonencode({
    Version = "2023-04-17"
    Id      = "public-read"
    Statement = [
      {
        Sid       = "PublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource  = ["${scaleway_object_bucket.this.name}/*"]
      },
      {
        Sid       = "Writers"
        Effect    = "Allow"
        Principal = { SCW = [for id in var.bucket_application_ids : "application_id:${id}"] }
        Action    = ["s3:*"]
        Resource  = [scaleway_object_bucket.this.name, "${scaleway_object_bucket.this.name}/*"]
      },
    ]
  })
}

# CDN + HTTPS sur un domaine personnalisé (Edge Services), seulement si `domain` est renseigné.
# Prérequis : un abonnement Edge Services actif sur le projet, et un CNAME du domaine vers le pipeline.
resource "scaleway_edge_services_pipeline" "this" {
  count = var.domain == null ? 0 : 1
  name  = var.bucket_name
}

resource "scaleway_edge_services_backend_stage" "this" {
  count       = var.domain == null ? 0 : 1
  pipeline_id = scaleway_edge_services_pipeline.this[0].id

  s3_backend_config {
    bucket_name   = scaleway_object_bucket.this.name
    bucket_region = scaleway_object_bucket.this.region
    is_website    = true
  }
}

resource "scaleway_edge_services_cache_stage" "this" {
  count            = var.domain == null ? 0 : 1
  pipeline_id      = scaleway_edge_services_pipeline.this[0].id
  backend_stage_id = scaleway_edge_services_backend_stage.this[0].id
}

resource "scaleway_edge_services_tls_stage" "this" {
  count               = var.domain == null ? 0 : 1
  pipeline_id         = scaleway_edge_services_pipeline.this[0].id
  cache_stage_id      = scaleway_edge_services_cache_stage.this[0].id
  managed_certificate = true
}

resource "scaleway_edge_services_dns_stage" "this" {
  count        = var.domain == null ? 0 : 1
  pipeline_id  = scaleway_edge_services_pipeline.this[0].id
  tls_stage_id = scaleway_edge_services_tls_stage.this[0].id
  fqdns        = [var.domain]
}

resource "scaleway_edge_services_head_stage" "this" {
  count         = var.domain == null ? 0 : 1
  pipeline_id   = scaleway_edge_services_pipeline.this[0].id
  head_stage_id = scaleway_edge_services_dns_stage.this[0].id
}
