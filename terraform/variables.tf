# General configuration

variable "region" {
  default = "eu-central-1"
}

variable "app_name" {
  default = "media-backend"
}

# Backend configuration (ECS, RDS, S3)

variable "app_image" {
  description = "Docker image for backend"
  default     = "402289717066.dkr.ecr.eu-central-1.amazonaws.com/media-backend:latest"
}

variable "container_port" {
  description = "Port on which the backend container listens"
  default = 3000
}

variable "db_username" {
  description = "RDS username"
  default     = "postgres"
}

variable "db_password" {
  description = "RDS password"
  default     = "postgres123"
}

variable "db_name" {
  description = "PostgreSQL database name"
  default     = "media_sharing"
}

variable "bucket_name_backend" {
  default = "assignment-backend-bucket"
}

# Frontend configuration (S3)

variable "bucket_name_frontend" {
  default = "assignment-frontend-bucket"
}

