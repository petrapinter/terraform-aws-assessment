output "alb_dns_name" {
  description = "The ALB domain name"
  value = aws_lb.app_lb.dns_name
}

output "cloudfront_domain_name" {
  description = "The CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend_distribution.id
}
