terraform {
  required_version = ">= 1.10"

  required_providers {
    scaleway = { source = "scaleway/scaleway", version = "~> 2.88" }
    random   = { source = "hashicorp/random", version = "~> 3.9" }
  }

  backend "s3" {
    bucket                      = "CHANGE-ME-tfstate"
    key                         = "production/terraform.tfstate"
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
    remote_state_data_sources {
      default {
        method = method.aes_gcm.state
      }
    }
  }
}

provider "scaleway" {
  region = "fr-par"
  zone   = "fr-par-1"
}

locals {
  environment = "production"
  name        = "${var.project}-${local.environment}"
  # OPS-003 : tags env, project, managed-by sur chaque ressource.
  tags = ["env:${local.environment}", "project:${var.project}", "managed-by:opentofu"]
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  tags   = local.tags
}

# Production : haute disponibilité, rétention de sauvegardes, au moins une instance active (OPS-005, OPS-007).
module "database" {
  source                = "../../modules/database"
  name                  = local.name
  private_network_id    = module.network.private_network_id
  node_type             = "DB-PRO2-XXS"
  high_availability     = true
  backup_retention_days = 14
  tags                  = local.tags
}

# BE-006 : secret de Better Auth (signature des cookies), propre à l'environnement.
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

# BE-009 : clé SMTP créée par envs/iam (ressource d'organisation, hors de portée de la clé de la CI).
data "terraform_remote_state" "iam" {
  backend = "s3"
  config = {
    bucket                      = "CHANGE-ME-tfstate"
    key                         = "iam/terraform.tfstate"
    region                      = "fr-par"
    endpoints                   = { s3 = "https://s3.fr-par.scw.cloud" }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

module "api" {
  source             = "../../modules/app-service"
  name               = "${local.name}-api"
  image              = var.api_image
  private_network_id = module.network.private_network_id
  min_scale          = 1
  max_scale          = 5

  environment_variables = {
    NODE_ENV           = "production"
    LOG_LEVEL          = "info"
    SENTRY_ENVIRONMENT = local.environment
    CORS_ORIGINS       = var.web_origin
    SENTRY_DSN         = var.api_sentry_dsn
    APP_NAME           = var.app_name
    MAIL_FROM          = var.mail_from
    BETTER_AUTH_URL    = var.api_url
    WEB_URL            = split(",", var.web_origin)[0]
  }

  secret_environment_variables = {
    DATABASE_URL       = module.database.database_url
    SMTP_URL           = data.terraform_remote_state.iam.outputs.smtp_urls["production"]
    BETTER_AUTH_SECRET = random_password.auth_secret.result
  }

  tags = local.tags
}

module "web" {
  source      = "../../modules/static-site"
  bucket_name = "${local.name}-web"
  domain      = var.web_domain
  tags        = local.tags
}
