
# ECR - Docker image tárolók

resource "aws_ecr_repository" "backend" {
  name = "media-backend"
}


# IAM - ECS Task és Execution role

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Effect = "Allow"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Effect = "Allow"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3_access" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}


# CloudWatch log group (ECS logs)

resource "aws_cloudwatch_log_group" "ecs_log_group" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 7
}


# ECS Cluster

resource "aws_ecs_cluster" "app_cluster" {
  name = "${var.app_name}-cluster"
}


# ECS Task Definition

resource "aws_ecs_task_definition" "app_task" {
  family                   = "${var.app_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = var.app_image
    essential = true
    portMappings = [{
      containerPort = var.container_port
      hostPort      = var.container_port
    }]
    environment = [
      { name = "DB_HOST",     value = aws_db_instance.postgres.address },
      { name = "DB_PORT",     value = "5432" },
      { name = "DB_USER",     value = var.db_username },
      { name = "DB_PASSWORD", value = var.db_password },
      { name = "DB_NAME",     value = var.db_name },

      # Storage (S3)
      { name = "BLOB_STORAGE_INTERNAL_ENDPOINT", value = "s3.${var.region}.amazonaws.com" },
      { name = "BLOB_STORAGE_PORT",              value = "443" },
      { name = "BLOB_STORAGE_USE_SSL",           value = "true" },
      { name = "BLOB_STORAGE_BUCKET",            value = var.bucket_name_backend },
      { name = "BLOB_STORAGE_REGION",            value = var.region },

      # CORS
      { name = "TRUSTED_ORIGINS",  value = "https://${aws_cloudfront_distribution.frontend_distribution.domain_name}" },
      { name = "ALLOWED_HEADERS",  value = "*" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.app_name}"
        awslogs-region        = var.region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}


# ECS Service

resource "aws_ecs_service" "app_service" {
  name            = "${var.app_name}-service"
  cluster         = aws_ecs_cluster.app_cluster.id
  task_definition = aws_ecs_task_definition.app_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app_tg.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]
}


# ALB (Application Load Balancer)

resource "aws_lb" "app_lb" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

resource "aws_lb_target_group" "app_tg" {
  name        = "${var.app_name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.app_vpc.id
  target_type = "ip"

  health_check {
    path                = "/health"
    port                = var.container_port
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}


# RDS (PostgreSQL)

resource "aws_db_subnet_group" "postgres_subnet_group" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier              = "${var.app_name}-db"
  allocated_storage       = 20
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t4g.micro"
  username                = var.db_username
  password                = var.db_password
  db_name                 = var.db_name
  port                    = 5432
  publicly_accessible     = false
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  db_subnet_group_name    = aws_db_subnet_group.postgres_subnet_group.name
  skip_final_snapshot     = true

  tags = {
    Name = "${var.app_name}-db"
  }
}


# S3 - User-uploaded files bucket

resource "aws_s3_bucket" "user_uploads" {
  bucket = var.bucket_name_backend
  force_destroy = true
  tags = {
    Name = var.bucket_name_backend
  }
}

resource "aws_s3_bucket_public_access_block" "user_uploads_block" {
  bucket = aws_s3_bucket.user_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_policy" "user_uploads_access" {
  name        = "${var.app_name}-user-uploads-access"
  description = "Allow ECS task to access user uploads S3 bucket"
  policy      = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Resource = "${aws_s3_bucket.user_uploads.arn}/*"
      },
      {
        Effect = "Allow",
        Action = ["s3:ListBucket"],
        Resource = aws_s3_bucket.user_uploads.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_user_uploads_policy_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.user_uploads_access.arn
}
