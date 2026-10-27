terraform {
  required_version = ">= 1.10"

  required_providers {
    scaleway = { source = "scaleway/scaleway", version = "~> 2.88" }
  }

  backend "s3" {
    bucket                      = "CHANGE-ME-tfstate"
    key                         = "iam/terraform.tfstate"
    region                      = "fr-par"
    endpoints                   = { s3 = "https://s3.fr-par.scw.cloud" }
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }

  # OPS-006 : le state contient des secrets générés (clés API, mots de passe) : il est chiffré.
  # Passphrase : variable TF_VAR_state_passphrase (secret GitHub TF_STATE_PASSPHRASE et gestionnaire de mots de passe).
  encryption {
    key_provider "pbkdf2" "state" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state
    }
    state {
      method   = method.aes_gcm.state
      enforced = true
    }
    plan {
      method   = method.aes_gcm.state
      enforced = true
    }
  }
}

provider "scaleway" {
  region = "fr-par"
  zone   = "fr-par-1"
}

# OPS-006 : les applications et clés IAM appartiennent à l'organisation Scaleway, pas au projet.
# La clé de la CI, limitée au projet, ne peut donc pas les créer. Ce dossier est appliqué
# à la main, une fois par projet (et à chaque rotation), avec une clé admin personnelle.
locals {
  tags = ["project:${var.project}", "managed-by:opentofu"]
}

# Clé de la CI du repo infra : tous les produits du projet, aucun droit IAM ni sur les autres projets.
module "ci" {
  source               = "../../modules/api-key"
  name                 = "${var.project}-ci"
  description          = "CI infra de ${var.project} : plan et apply OpenTofu"
  project_id           = var.project_id
  permission_set_names = ["AllProductsFullAccess"]
  tags                 = local.tags
}

# Clés de déploiement des repos applicatifs (OPS-006 : une clé par pipeline).
# Object Storage est limité au projet, pas à un bucket : la clé web peut écrire dans les autres
# buckets du projet, dont celui du state (chiffré et versionné).
locals {
  deploy_keys = {
    web = {
      description = "Déploiement du front de ${var.project} : envoi du build dans le bucket"
      permissions = [
        "ObjectStorageBucketsRead",
        "ObjectStorageObjectsRead",
        "ObjectStorageObjectsWrite",
        "ObjectStorageObjectsDelete",
      ]
    }
    api = {
      description = "Déploiement de l'API de ${var.project} : push d'image et mise à jour du conteneur"
      permissions = ["ContainerRegistryFullAccess", "ContainersFullAccess"]
    }
  }
}

module "deploy" {
  source               = "../../modules/api-key"
  for_each             = local.deploy_keys
  name                 = "${var.project}-deploy-${each.key}"
  description          = each.value.description
  project_id           = var.project_id
  permission_set_names = each.value.permissions
  tags                 = local.tags
}

# BE-009 : une clé SMTP par environnement, limitée à l'envoi d'e-mails.
module "smtp" {
  source               = "../../modules/api-key"
  for_each             = toset(["staging", "production"])
  name                 = "${var.project}-${each.key}-smtp"
  description          = "Envoi SMTP de ${var.project} (${each.key}), BE-009"
  project_id           = var.project_id
  permission_set_names = ["TransactionalEmailEmailSmtpCreate"]
  tags                 = concat(local.tags, ["env:${each.key}"])
}
