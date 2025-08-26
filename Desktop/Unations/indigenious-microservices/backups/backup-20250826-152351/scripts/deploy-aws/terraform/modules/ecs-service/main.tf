# ======================================================================
# ECS SERVICE MODULE - REUSABLE FOR ALL MICROSERVICES
# ======================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ======================================================================
# VARIABLES
# ======================================================================

variable "service_name" {
  description = "Name of the service"
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
  default     = "indigenous-cluster"
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
}

variable "cpu" {
  description = "CPU units for the task"
  type        = string
  default     = "256"
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Minimum number of tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for auto-scaling"
  type        = number
  default     = 5
}

variable "port" {
  description = "Container port"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health check path"
  type        = string
  default     = "/health"
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets from AWS Secrets Manager"
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "target_group_arn" {
  description = "Target group ARN for load balancer"
  type        = string
  default     = ""
}

variable "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  type        = string
  default     = ""
}

variable "enable_fargate_spot" {
  description = "Enable Fargate Spot for cost savings"
  type        = bool
  default     = true
}

variable "fargate_spot_weight" {
  description = "Weight for Fargate Spot capacity provider"
  type        = number
  default     = 70
}

variable "enable_circuit_breaker" {
  description = "Enable ECS circuit breaker"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = true
}

variable "task_role_arn" {
  description = "IAM role ARN for the task"
  type        = string
  default     = ""
}

variable "execution_role_arn" {
  description = "IAM role ARN for task execution"
  type        = string
  default     = ""
}

# ======================================================================
# DATA SOURCES
# ======================================================================

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

data "aws_ecs_cluster" "main" {
  cluster_name = var.cluster_name
}

# ======================================================================
# CLOUDWATCH LOG GROUP
# ======================================================================

resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = 30

  tags = {
    Service = var.service_name
  }
}

# ======================================================================
# TASK DEFINITION
# ======================================================================

resource "aws_ecs_task_definition" "service" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  
  execution_role_arn = var.execution_role_arn != "" ? var.execution_role_arn : aws_iam_role.execution[0].arn
  task_role_arn      = var.task_role_arn != "" ? var.task_role_arn : aws_iam_role.task[0].arn

  container_definitions = jsonencode([
    {
      name  = var.service_name
      image = var.image_tag
      
      cpu    = tonumber(var.cpu)
      memory = tonumber(var.memory)
      
      essential = true
      
      portMappings = [
        {
          containerPort = var.port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        for key, value in var.environment_variables : {
          name  = key
          value = value
        }
      ]
      
      secrets = [
        for key, value in var.secrets : {
          name      = key
          valueFrom = value
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:${var.port}${var.health_check_path} || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Service = var.service_name
  }
}

# ======================================================================
# SECURITY GROUP
# ======================================================================

resource "aws_security_group" "service" {
  name        = "${var.service_name}-sg"
  description = "Security group for ${var.service_name}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # VPC CIDR
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Service = var.service_name
  }
}

# ======================================================================
# ECS SERVICE
# ======================================================================

resource "aws_ecs_service" "service" {
  name            = var.service_name
  cluster         = data.aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count
  
  launch_type = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }
  
  # Load balancer configuration (if target group is provided)
  dynamic "load_balancer" {
    for_each = var.target_group_arn != "" ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.service_name
      container_port   = var.port
    }
  }
  
  # Service discovery
  dynamic "service_registries" {
    for_each = var.service_discovery_namespace_id != "" ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.service[0].arn
    }
  }
  
  # Capacity provider strategy for Fargate Spot
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = var.enable_fargate_spot ? (100 - var.fargate_spot_weight) : 100
    base              = var.enable_fargate_spot ? 0 : var.min_capacity
  }
  
  dynamic "capacity_provider_strategy" {
    for_each = var.enable_fargate_spot ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight            = var.fargate_spot_weight
    }
  }
  
  # Circuit breaker
  deployment_circuit_breaker {
    enable   = var.enable_circuit_breaker
    rollback = var.enable_circuit_breaker
  }
  
  # ECS Exec
  enable_ecs_managed_tags = true
  enable_execute_command  = var.enable_execute_command
  
  # Deployment configuration
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  
  # Grace period for load balancer
  health_check_grace_period_seconds = var.target_group_arn != "" ? 60 : null
  
  tags = {
    Service = var.service_name
  }
  
  lifecycle {
    ignore_changes = [desired_count]  # Allow auto-scaling to manage this
  }
}

# ======================================================================
# SERVICE DISCOVERY
# ======================================================================

resource "aws_service_discovery_service" "service" {
  count = var.service_discovery_namespace_id != "" ? 1 : 0
  
  name = var.service_name
  
  dns_config {
    namespace_id = var.service_discovery_namespace_id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }
  
  health_check_custom_config {
    failure_threshold = 1
  }
}

# ======================================================================
# AUTO SCALING
# ======================================================================

resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU Utilization Scaling Policy
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Memory Utilization Scaling Policy
resource "aws_appautoscaling_policy" "memory" {
  name               = "${var.service_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ======================================================================
# IAM ROLES (Created only if not provided)
# ======================================================================

# Task Execution Role
resource "aws_iam_role" "execution" {
  count = var.execution_role_arn == "" ? 1 : 0
  
  name = "${var.service_name}-execution-role"
  
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

resource "aws_iam_role_policy_attachment" "execution" {
  count = var.execution_role_arn == "" ? 1 : 0
  
  role       = aws_iam_role.execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task Role
resource "aws_iam_role" "task" {
  count = var.task_role_arn == "" ? 1 : 0
  
  name = "${var.service_name}-task-role"
  
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

# ======================================================================
# CLOUDWATCH ALARMS
# ======================================================================

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.service_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ECS CPU utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.service.name
    ClusterName = var.cluster_name
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.service_name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ECS memory utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.service.name
    ClusterName = var.cluster_name
  }
}

# ======================================================================
# OUTPUTS
# ======================================================================

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.service.name
}

output "service_id" {
  description = "ECS service ID"
  value       = aws_ecs_service.service.id
}

output "task_definition_arn" {
  description = "Task definition ARN"
  value       = aws_ecs_task_definition.service.arn
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.service.id
}

output "service_discovery_name" {
  description = "Service discovery name"
  value       = var.service_discovery_namespace_id != "" ? aws_service_discovery_service.service[0].name : ""
}