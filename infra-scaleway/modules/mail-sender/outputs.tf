output "smtp_url" {
  description = "Variable SMTP_URL de l'API : ID du projet et clé secrète, STARTTLS sur le port 587"
  value = format(
    "smtp://%s:%s@%s:%d",
    urlencode(data.scaleway_tem_domain.this.project_id),
    urlencode(scaleway_iam_api_key.this.secret_key),
    data.scaleway_tem_domain.this.smtp_host,
    data.scaleway_tem_domain.this.smtp_port,
  )
  sensitive = true
}
