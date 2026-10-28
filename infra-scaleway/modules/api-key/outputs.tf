output "access_key" {
  value = scaleway_iam_api_key.this.access_key
}

output "secret_key" {
  value     = scaleway_iam_api_key.this.secret_key
  sensitive = true
}

output "application_id" {
  description = "Principal à autoriser dans une bucket policy (`application_id:<id>`)"
  value       = scaleway_iam_application.this.id
}
