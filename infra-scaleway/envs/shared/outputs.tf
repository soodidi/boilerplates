output "registry_endpoint" {
  description = "Préfixe des images, à mettre dans la variable REGISTRY_IMAGE de l'API (…/api)"
  value       = scaleway_registry_namespace.this.endpoint
}

output "mail_dns_records" {
  description = "Enregistrements à publier chez le registrar si la zone DNS n'est pas chez Scaleway (BE-009)"
  value = {
    spf   = { type = "TXT", name = var.mail_domain, value = scaleway_tem_domain.mail.spf_value }
    dkim  = { type = "TXT", name = scaleway_tem_domain.mail.dkim_name, value = scaleway_tem_domain.mail.dkim_config }
    dmarc = { type = "TXT", name = scaleway_tem_domain.mail.dmarc_name, value = scaleway_tem_domain.mail.dmarc_config }
  }
}
