terraform {
  required_version = ">= 1.10"

  required_providers {
    scaleway = { source = "scaleway/scaleway", version = "~> 2.88" }
    random   = { source = "hashicorp/random", version = "~> 3.9" }
  }

  backend "s3" {
    bucket                      = "CHANGE-ME-tfstate"
    key                         = "staging/terraform.tfstate"
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

locals {
  environment = "staging"
  name        = "${var.project}-${local.environment}"
  # OPS-003 : tags env, project, managed-by sur chaque ressource.
  tags = ["env:${local.environment}", "project:${var.project}", "managed-by:opentofu"]
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  tags   = local.tags
}

# Staging : mêmes modules que la production, en plus petit (OPS-004).
module "database" {
  source             = "../../modules/database"
  name               = local.name
  private_network_id = module.network.private_network_id
  node_type          = "DB-DEV-S"
  high_availability  = false
  tags               = local.tags
}

# BE-006 : secret de Better Auth (signature des cookies), propre à l'environnement.
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

module "mail" {
  source = "../../modules/mail-sender"
  name   = local.name
  domain = var.mail_domain
}

module "api" {
  source             = "../../modules/app-service"
  name               = "${local.name}-api"
  image              = var.api_image
  private_network_id = module.network.private_network_id
  min_scale          = 0
  max_scale          = 2

  environment_variables = {
    NODE_ENV                = "production"
    LOG_LEVEL               = "info"
    SENTRY_ENVIRONMENT      = local.environment
    CORS_ORIGINS            = var.web_origin
    SENTRY_DSN              = var.api_sentry_dsn
    APP_NAME                = var.app_name
    MAIL_FROM               = var.mail_from
    BETTER_AUTH_URL         = var.api_url
    WEB_URL                 = split(",", var.web_origin)[0]
    MAIL_ALLOWED_RECIPIENTS = var.mail_allowed_recipients
  }

  secret_environment_variables = {
    DATABASE_URL       = module.database.database_url
    SMTP_URL           = module.mail.smtp_url
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
