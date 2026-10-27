terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
  }
}

resource "scaleway_container_namespace" "this" {
  name = var.name
  tags = var.tags
}

# OPS-005 : backend en Serverless Container, relié au réseau privé de la base.
resource "scaleway_container" "this" {
  name         = var.name
  namespace_id = scaleway_container_namespace.this.id
  image        = var.image
  port         = var.port

  cpu_limit          = var.cpu_limit
  memory_limit_bytes = var.memory_limit_bytes
  min_scale          = var.min_scale
  max_scale          = var.max_scale
  timeout            = 60

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true
  private_network_id     = var.private_network_id

  environment_variables        = var.environment_variables
  secret_environment_variables = var.secret_environment_variables

  # BE-007 : sondes branchées sur les endpoints de santé de l'API.
  liveness_probe {
    http {
      path = "/health/live"
    }
    failure_threshold = 3
    interval          = "10s"
    timeout           = "5s"
  }

  startup_probe {
    http {
      path = "/health/ready"
    }
    failure_threshold = 30
    interval          = "5s"
    timeout           = "5s"
  }

  tags = var.tags

  lifecycle {
    # OPS-004 : l'image est déployée par la CI de l'application, pas par OpenTofu.
    ignore_changes = [image]
  }
}

# BE-006 : domaine de l'API sur le même site que le front (cookie de session). Le CNAME du domaine
# vers `dns_target` doit exister avant l'apply (Scaleway vérifie le DNS et émet le certificat).
resource "scaleway_container_domain" "this" {
  count        = var.domain == null ? 0 : 1
  container_id = scaleway_container.this.id
  hostname     = var.domain
}
