terraform {
  required_version = ">= 1.10"

  required_providers {
    scaleway = { source = "scaleway/scaleway", version = "~> 2.88" }
  }

  # OPS-003 : state distant, chiffré au repos, versionné, verrouillé. Un state par environnement.
  # Le bucket se crée une seule fois à la main (voir README), c'est la seule exception au « tout en code ».
  backend "s3" {
    bucket                      = "CHANGE-ME-tfstate"
    key                         = "shared/terraform.tfstate"
    region                      = "fr-par"
    endpoints                   = { s3 = "https://s3.fr-par.scw.cloud" }
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "scaleway" {
  region = "fr-par"
  zone   = "fr-par-1"
}

# OPS-001 : un seul registre ; la même image est promue de staging à production.
resource "scaleway_registry_namespace" "this" {
  name        = var.project
  description = "Images Docker de ${var.project}"
  is_public   = false
}

# BE-009 : domaine d'envoi des e-mails, commun à staging et production.
# `accept_tos` accepte la politique anti-spam de Scaleway TEM au moment de l'apply.
resource "scaleway_tem_domain" "mail" {
  name       = var.mail_domain
  accept_tos = true
  # true si la zone DNS est gérée chez Scaleway : SPF, DKIM et DMARC sont alors créés automatiquement.
  autoconfig = var.mail_dns_autoconfig
}
