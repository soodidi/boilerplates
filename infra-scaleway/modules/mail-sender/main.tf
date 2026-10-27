terraform {
  required_providers {
    scaleway = { source = "scaleway/scaleway" }
  }
}

# BE-009 : identifiants SMTP propres à un environnement, limités à l'envoi d'e-mails.
# Le domaine d'envoi est créé une seule fois dans envs/shared.
data "scaleway_tem_domain" "this" {
  name = var.domain
}

resource "scaleway_iam_application" "this" {
  name        = "${var.name}-smtp"
  description = "Envoi d'e-mails SMTP de ${var.name} (BE-009)"
}

resource "scaleway_iam_policy" "this" {
  name           = "${var.name}-smtp"
  description    = "Envoi SMTP uniquement, sur le projet du domaine ${var.domain}"
  application_id = scaleway_iam_application.this.id

  rule {
    project_ids          = [data.scaleway_tem_domain.this.project_id]
    permission_set_names = ["TransactionalEmailEmailSmtpCreate"]
  }
}

resource "scaleway_iam_api_key" "this" {
  application_id = scaleway_iam_application.this.id
  description    = "SMTP de ${var.name} (BE-009)"
}
