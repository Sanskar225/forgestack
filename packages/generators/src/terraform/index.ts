import type { ForgeConfig } from '@sanskar225/core';
import type { GeneratedFile } from '../types.js';

export function generateTerraformFiles(config: ForgeConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { infrastructure, database } = config;

  if (infrastructure?.iac !== 'terraform') {
    return files;
  }

  const isAws = infrastructure.cloud === 'aws';
  const hasRds = infrastructure.aws?.database === 'rds' || database?.provider === 'postgresql';
  const hasS3 = infrastructure.aws?.storage?.includes('s3');
  const compute = infrastructure.aws?.compute || 'ecs';

  if (!isAws) {
    return files;
  }

  // 1. main.tf
  const mainTf = `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "ForgeStack"
    }
  }
}
`;
  files.push({ path: 'infrastructure/terraform/main.tf', content: mainTf });

  // 2. variables.tf
  const variablesTf = `variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "${config.project.name}"
}

variable "db_password" {
  description = "Master password for PostgreSQL database"
  type        = string
  sensitive   = true
  default     = "ChangeMeInProductionSecret123!"
}
`;
  files.push({ path: 'infrastructure/terraform/variables.tf', content: variablesTf });

  // 3. vpc.tf
  const vpcTf = `resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.project_name}-vpc-\${var.environment}"
  }
}

resource "aws_subnet" "public_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "\${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "\${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-public-2"
  }
}

resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "\${var.aws_region}a"

  tags = {
    Name = "\${var.project_name}-private-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = "\${var.aws_region}b"

  tags = {
    Name = "\${var.project_name}-private-2"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-igw"
  }
}
`;
  files.push({ path: 'infrastructure/terraform/vpc.tf', content: vpcTf });

  // 4. compute.tf (ECS Fargate)
  if (compute === 'ecs') {
    const computeTf = `resource "aws_ecs_cluster" "main" {
  name = "\${var.project_name}-cluster-\${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "\${var.project_name}-api-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "node:22-alpine" # Replace with ECR image URI
      essential = true
      portMappings = [
        {
          containerPort = ${config.backend?.port || 4000}
          hostPort      = ${config.backend?.port || 4000}
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/\${var.project_name}-api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "\${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_attach" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
`;
    files.push({ path: 'infrastructure/terraform/compute.tf', content: computeTf });
  }

  // 5. database.tf (RDS PostgreSQL)
  if (hasRds) {
    const databaseTf = `resource "aws_db_subnet_group" "db_subnet" {
  name       = "\${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "\${var.project_name}-db-subnet-group"
  }
}

resource "aws_security_group" "db_sg" {
  name        = "\${var.project_name}-db-sg"
  description = "Allow inbound PostgreSQL traffic from VPC"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "\${var.project_name}-postgres-\${var.environment}"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"
  db_name                = "app_db"
  username               = "postgres"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_subnet.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true
}
`;
    files.push({ path: 'infrastructure/terraform/database.tf', content: databaseTf });
  }

  // 6. storage.tf (S3)
  if (hasS3) {
    const storageTf = `resource "aws_s3_bucket" "assets" {
  bucket = "\${var.project_name}-assets-\${var.environment}"

  tags = {
    Name = "\${var.project_name}-assets"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets_crypto" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
`;
    files.push({ path: 'infrastructure/terraform/storage.tf', content: storageTf });
  }

  // 7. outputs.tf
  const outputsTf = `output "vpc_id" {
  value = aws_vpc.main.id
}

${hasRds ? `output "rds_endpoint" {\n  value = aws_db_instance.postgres.endpoint\n}` : ''}
${hasS3 ? `output "s3_bucket_name" {\n  value = aws_s3_bucket.assets.id\n}` : ''}
`;
  files.push({ path: 'infrastructure/terraform/outputs.tf', content: outputsTf });

  return files;
}
