// ─── TerraformGenerator.ts ───────────────────────────────────────────────────
// Gera configuração Terraform (AWS) a partir de diagramas de rede e arquitetura.

import type { CanvasDiagram, GeneratedArtifact } from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

const AWS_RESOURCE_MAP: Record<
  string,
  { resource: string; amiOrEngine?: string }
> = {
  "rest-api": {
    resource: "aws_instance",
    amiOrEngine: "ami-0c55b159cbfafe1f0",
  },
  "graphql-api": {
    resource: "aws_instance",
    amiOrEngine: "ami-0c55b159cbfafe1f0",
  },
  microservice: { resource: "aws_instance" },
  monolith: { resource: "aws_instance" },
  "serverless-fn": { resource: "aws_lambda_function" },
  "database-sql": { resource: "aws_db_instance", amiOrEngine: "postgres" },
  "database-nosql": { resource: "aws_dynamodb_table" },
  cache: { resource: "aws_elasticache_cluster", amiOrEngine: "redis" },
  "load-balancer": { resource: "aws_lb" },
  "object-storage": { resource: "aws_s3_bucket" },
  "message-queue": { resource: "aws_sqs_queue" },
  "event-bus": { resource: "aws_msk_cluster" },
  cdn: { resource: "aws_cloudfront_distribution" },
  "api-gateway": { resource: "aws_apigatewayv2_api" },
  firewall: { resource: "aws_security_group" },
  "firewall-waf": { resource: "aws_wafv2_web_acl" },
  dns: { resource: "aws_route53_zone" },
  router: { resource: "aws_vpc" },
  "switch-l2": { resource: "aws_subnet" },
  "switch-l3": { resource: "aws_subnet" },
  server: { resource: "aws_instance" },
};

function sanitize(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || "resource"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

export function generateTerraform(diagram: CanvasDiagram): GeneratedArtifact {
  const lines: string[] = [];

  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push(`# Terraform Configuration — gerado por NetBuilder Academy`);
  lines.push(`# Diagrama: ${sanitize(diagram.name)} (${diagram.type})`);
  lines.push(`# Gerado em: ${new Date().toISOString()}`);
  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push("");

  // Variables
  lines.push('variable "aws_region" {');
  lines.push('  default = "us-east-1"');
  lines.push("}");
  lines.push('variable "db_username" {');
  lines.push('  default = "admin"');
  lines.push("}");
  lines.push('variable "db_password" {');
  lines.push("  sensitive = true");
  lines.push("}");
  lines.push("");
  lines.push("terraform {");
  lines.push("  required_providers {");
  lines.push("    aws = {");
  lines.push('      source  = "hashicorp/aws"');
  lines.push('      version = "~> 5.0"');
  lines.push("    }");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push('provider "aws" {');
  lines.push("  region = var.aws_region");
  lines.push("}");
  lines.push("");
  lines.push('variable "aws_region" {');
  lines.push('  default = "us-east-1"');
  lines.push("}");
  lines.push("");

  // VPC
  lines.push(
    "# ── VPC ──────────────────────────────────────────────────────────",
  );
  lines.push('resource "aws_vpc" "main" {');
  lines.push('  cidr_block           = "10.0.0.0/16"');
  lines.push("  enable_dns_hostnames = true");
  lines.push('  tags = { Name = "netbuilder-vpc" }');
  lines.push("}");
  lines.push("");
  lines.push('resource "aws_subnet" "public" {');
  lines.push("  vpc_id                  = aws_vpc.main.id");
  lines.push('  cidr_block              = "10.0.1.0/24"');
  lines.push("  map_public_ip_on_launch = true");
  lines.push('  tags = { Name = "public-subnet" }');
  lines.push("}");
  lines.push("");
  lines.push('resource "aws_subnet" "private" {');
  lines.push("  vpc_id     = aws_vpc.main.id");
  lines.push('  cidr_block = "10.0.2.0/24"');
  lines.push('  tags = { Name = "private-subnet" }');
  lines.push("}");
  lines.push("");

  // Security Group
  lines.push('resource "aws_security_group" "app_sg" {');
  lines.push('  name        = "app-security-group"');
  lines.push("  vpc_id      = aws_vpc.main.id");
  lines.push("  ingress {");
  lines.push("    from_port   = 80");
  lines.push("    to_port     = 80");
  lines.push('    protocol    = "tcp"');
  lines.push('    cidr_blocks = ["0.0.0.0/0"]');
  lines.push("  }");
  lines.push("  ingress {");
  lines.push("    from_port   = 443");
  lines.push("    to_port     = 443");
  lines.push('    protocol    = "tcp"');
  lines.push('    cidr_blocks = ["0.0.0.0/0"]');
  lines.push("  }");
  lines.push("  egress {");
  lines.push("    from_port   = 0");
  lines.push("    to_port     = 0");
  lines.push('    protocol    = "-1"');
  lines.push('    cidr_blocks = ["0.0.0.0/0"]');
  lines.push("  }");
  lines.push('  tags = { Name = "app-sg" }');
  lines.push("}");
  lines.push("");

  // Per-component resources
  for (const comp of diagram.components) {
    const mapping = AWS_RESOURCE_MAP[comp.type];
    if (!mapping) continue;

    const name = sanitize(comp.label);
    lines.push(`# ── ${comp.label} (${comp.type}) ──`);

    switch (mapping.resource) {
      case "aws_instance":
        lines.push(`resource "aws_instance" "${name}" {`);
        lines.push(
          `  ami                    = "${mapping.amiOrEngine ?? "ami-0c55b159cbfafe1f0"}"`,
        );
        lines.push('  instance_type          = "t3.micro"');
        lines.push("  subnet_id             = aws_subnet.private.id");
        lines.push("  vpc_security_group_ids = [aws_security_group.app_sg.id]");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_db_instance":
        lines.push(`resource "aws_db_instance" "${name}" {`);
        lines.push(
          `  engine               = "${mapping.amiOrEngine ?? "postgres"}"`,
        );
        lines.push('  engine_version       = "16"');
        lines.push('  instance_class       = "db.t3.micro"');
        lines.push("  allocated_storage    = 20");
        lines.push(`  db_name             = "${name}_db"`);
        lines.push("  username            = var.db_username");
        lines.push(
          "  password            = var.db_password  # sensitive — set via TF_VAR_db_password",
        );
        lines.push("  skip_final_snapshot  = true");
        lines.push("  vpc_security_group_ids = [aws_security_group.app_sg.id]");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_elasticache_cluster":
        lines.push(`resource "aws_elasticache_cluster" "${name}" {`);
        lines.push('  cluster_id           = "' + name + '"');
        lines.push(
          `  engine              = "${mapping.amiOrEngine ?? "redis"}"`,
        );
        lines.push('  node_type           = "cache.t3.micro"');
        lines.push("  num_cache_nodes     = 1");
        lines.push("  port                = 6379");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_lb":
        lines.push(`resource "aws_lb" "${name}" {`);
        lines.push(`  name               = "${name}"`);
        lines.push("  internal           = false");
        lines.push('  load_balancer_type = "application"');
        lines.push("  subnets            = [aws_subnet.public.id]");
        lines.push("  security_groups    = [aws_security_group.app_sg.id]");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_s3_bucket":
        lines.push(`resource "aws_s3_bucket" "${name}" {`);
        lines.push(`  bucket = "${name}-\${var.aws_region}"`);
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_sqs_queue":
        lines.push(`resource "aws_sqs_queue" "${name}" {`);
        lines.push(`  name = "${name}"`);
        lines.push("  visibility_timeout_seconds = 30");
        lines.push("  message_retention_seconds  = 86400");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      case "aws_lambda_function":
        lines.push(`resource "aws_lambda_function" "${name}" {`);
        lines.push(`  function_name = "${name}"`);
        lines.push('  runtime       = "nodejs20.x"');
        lines.push('  handler       = "index.handler"');
        lines.push('  filename      = "lambda_placeholder.zip"');
        lines.push("  memory_size   = 256");
        lines.push("  timeout       = 30");
        lines.push(`  tags = { Name = "${comp.label}" }`);
        lines.push("}");
        break;

      default:
        lines.push(`# TODO: Implement ${mapping.resource} for ${comp.type}`);
    }

    lines.push("");
  }

  return {
    type: "terraform",
    filename: "main.tf",
    content: lines.join("\n"),
    language: "hcl",
  };
}
