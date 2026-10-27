output "access_key" {
  value = scaleway_iam_api_key.this.access_key
}

output "secret_key" {
  value     = scaleway_iam_api_key.this.secret_key
  sensitive = true
}
