terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
  }
}

# OPS-005 : la base et l'API communiquent par un réseau privé, jamais par Internet.
resource "scaleway_vpc" "this" {
  name = var.name
  tags = var.tags
}

resource "scaleway_vpc_private_network" "this" {
  name   = var.name
  vpc_id = scaleway_vpc.this.id
  tags   = var.tags
}
