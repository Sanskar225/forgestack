import type { ForgeConfig } from '@sanskar22/core';
import type { GeneratedFile } from '../types.js';

export function generateCicdFiles(config: ForgeConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { cicd, containers, infrastructure } = config;

  if (cicd?.provider !== 'github-actions') {
    return files;
  }

  // 1. CI Workflow (.github/workflows/ci.yml)
  const ciYml = `name: CI Pipeline

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    name: Lint, Typecheck & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Typecheck
        run: npm run build

      - name: Run Tests
        run: npm test --if-present

  ${
    containers?.docker
      ? `docker-build:
    name: Docker Image Build Validation
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: actions/setup-buildx-action@v3

      - name: Build Docker Image
        run: docker compose build
`
      : ''
  }
`;
  files.push({ path: '.github/workflows/ci.yml', content: ciYml });

  // 2. Deployment Workflow (.github/workflows/deploy.yml)
  if (infrastructure?.cloud === 'aws' && infrastructure.aws?.compute === 'ecs') {
    const deployEcsYml = `name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Build, Push & Deploy to ECS
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ secrets.AWS_REGION || 'us-east-1' }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & Push Docker Image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${config.project.name}-api
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
`;
    files.push({ path: '.github/workflows/deploy.yml', content: deployEcsYml });
  }

  return files;
}
