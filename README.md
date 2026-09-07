<div align="center">

# 🚀 ForgeStack

### *Architecture-Aware Application & Cloud Infrastructure Generator*

[![NPM Version](https://img.shields.io/npm/v/@sanskar22/create-forgestack.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@sanskar22/create-forgestack)
[![NPM Downloads](https://img.shields.io/npm/dt/@sanskar22/create-forgestack.svg?style=flat-square&color=23272f)](https://www.npmjs.com/package/@sanskar22/create-forgestack)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-0284c7?style=flat-square&logo=turborepo)](https://turbo.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-vitest%20passing-success?style=flat-square&logo=vitest)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>Stop running 50+ setup commands and stitching incompatible configs manually.</b><br/>
  ForgeStack generates production-grade, zero-bloat Monorepos, Docker Compose, Terraform IaC, Kubernetes manifests, OpenTelemetry, and CI/CD pipelines in seconds.
</p>

```bash
npx @sanskar22/create-forgestack my-app
```

</div>

---

## ⚡ Why ForgeStack?

Starting a modern production system requires making dozens of critical architectural choices:
* Monorepo tooling (`pnpm` + `Turborepo`)
* Database ORMs (`Prisma`, `Drizzle`, `Mongoose`)
* Distributed caching & job queues (`Redis`, `BullMQ`)
* Cloud infrastructure (`AWS ECS`, `RDS`, `S3`, `Terraform`, `Kubernetes`)
* Production observability (`OpenTelemetry`, `Prometheus`, `Pino`, `Sentry`)
* CI/CD automation (`GitHub Actions`)

Traditional template repositories are **bloated with unneeded dependencies** that break when customized. Naive AI generators **hallucinate invalid package versions and broken manifests**.

**ForgeStack introduces a Deterministic Architecture Engine** powered by a canonical single source of truth (`forge.config.yaml`). It statically validates structural anti-patterns, resolves the exact dependency Directed Acyclic Graph (DAG), and emits clean, zero-drift code.

---

## 📦 Published Packages on NPM Registry

| Package | Version | Purpose |
| :--- | :--- | :--- |
| [**`@sanskar22/create-forgestack`**](https://www.npmjs.com/package/@sanskar22/create-forgestack) | [![npm](https://img.shields.io/npm/v/@sanskar22/create-forgestack?color=red&style=flat-square)](https://www.npmjs.com/package/@sanskar22/create-forgestack) | Global Scaffolding CLI (`npx @sanskar22/create-forgestack`) |
| [**`@sanskar22/forge-cli`**](https://www.npmjs.com/package/@sanskar22/forge-cli) | [![npm](https://img.shields.io/npm/v/@sanskar22/forge-cli?color=red&style=flat-square)](https://www.npmjs.com/package/@sanskar22/forge-cli) | In-Project Architecture Manager CLI (`forge` / `npx forge`) |
| [**`@sanskar22/core`**](https://www.npmjs.com/package/@sanskar22/core) | [![npm](https://img.shields.io/npm/v/@sanskar22/core?color=red&style=flat-square)](https://www.npmjs.com/package/@sanskar22/core) | Deterministic Architecture Engine, Zod Schemas & DAG Resolver |
| [**`@sanskar22/templates`**](https://www.npmjs.com/package/@sanskar22/templates) | [![npm](https://img.shields.io/npm/v/@sanskar22/templates?color=red&style=flat-square)](https://www.npmjs.com/package/@sanskar22/templates) | Modular code skeletons, Dockerfiles & Terraform modules |
| [**`@sanskar22/generators`**](https://www.npmjs.com/package/@sanskar22/generators) | [![npm](https://img.shields.io/npm/v/@sanskar22/generators?color=red&style=flat-square)](https://www.npmjs.com/package/@sanskar22/generators) | Deterministic File Emitters & Orchestrator |

---

## 🚀 Quickstart

### 1. Interactive Generator
Run the interactive CLI wizard with zero installation:

```bash
npx @sanskar22/create-forgestack my-production-app
```

```text
┌   🚀 ForgeStack: Architecture-Aware Generator
│
◆  Select project template:
│  ● Full-Stack Application (Monorepo with Frontend + Backend + Shared Packages)
│  ○ Backend API Only
│  ○ Cloud Infrastructure Only (Terraform / Kubernetes)
│
◆  Select backend architecture pattern:
│  ● Modular Monolith (Clean domain boundaries)
│  ○ Clean Architecture (Domain, UseCases, Repositories)
│  ○ Microservices Architecture
│
◆  Select cloud deployment target:
│  ● AWS ECS Fargate + RDS + Terraform
│  ○ Kubernetes (EKS / GKE)
│  ○ Docker Swarm / Standalone Container
└  ✨ Scaffolding production architecture in 5.2s...
```

---

### 2. Instant Production Presets

Scaffold complete, production-tested architectures with flags:

```bash
# Fullstack SaaS (Next.js + Express + Prisma + Redis + BullMQ + AWS ECS Terraform + OTel)
npx @sanskar22/create-forgestack my-saas --preset saas

# Minimal High-Performance REST API with Health Checks, Pino, Docker
npx @sanskar22/create-forgestack my-api --preset minimal-api

# Enterprise AWS Cloud Infrastructure with Terraform (ECS + RDS + ElastiCache + S3)
npx @sanskar22/create-forgestack my-aws-infra --preset infra-aws

# Enterprise Kubernetes Infrastructure (Deployments, Ingress, HPA, Probes, ConfigMaps)
npx @sanskar22/create-forgestack my-k8s --preset infra-k8s
```

---

## 🛠️ The In-Project Architecture Manager (`forge`)

Inside any ForgeStack-generated project, use the local `forge` CLI to manage architectural evolution without drift:

```bash
# 1. Run environment, runtime, container, and database health diagnostics
npx forge doctor

# 2. Validate architecture rules, compatibility gates, and dependency constraints
npx forge validate

# 3. Render terminal ASCII topology & refresh ARCHITECTURE.md + Mermaid diagrams
npx forge visualize

# 4. Dynamically inject architectural capabilities without manual boilerplate
npx forge add redis
npx forge add bullmq
npx forge add auth
npx forge add s3
npx forge add terraform
npx forge add kubernetes

# 5. Safely prune unneeded services and re-synchronize manifests
npx forge remove bullmq

# 6. Re-synchronize code and infrastructure files from forge.config.yaml
npx forge generate

# 7. Detect architectural drift between filesystem and config
npx forge diff
```

---

## 📐 Generated Production Architecture

```text
+--------------------------------------------------------------------+
| ForgeStack Generated Topology                                      |
+--------------------------------------------------------------------+

   [ Client / Browser ]
            |
            v
   [ Frontend: Next.js 14 App Router (Tailwind CSS) ]
            |
            v (HTTP / REST API)
   [ AWS Application Load Balancer ]
            |
            v
   [ Backend API: Express Modular Monolith on AWS ECS ]
      |            |            |
      v            v            v
 [ PostgreSQL ]  [ Redis Cache ]  [ Telemetry: Prometheus + Pino ]
 (via Prisma)         |
                      v
             [ BullMQ Worker Process ]

+--------------------------------------------------------------------+
```

---

## 🏗️ Monorepo Structure

ForgeStack monorepos use **pnpm workspaces** and **Turborepo** for optimized caching and fast parallel builds:

```text
my-production-app/
├── apps/
│   ├── web/                    # Next.js 14 App Router / React Vite frontend
│   ├── api/                    # Express / Fastify modular backend
│   └── worker/                 # BullMQ background worker service
│
├── packages/
│   ├── types/                  # Shared TypeScript types & DTOs
│   └── config/                 # Shared ESLint, Prettier, & tsconfig
│
├── infrastructure/
│   ├── terraform/              # Modular Terraform (VPC, ECS, RDS, S3, Redis)
│   └── k8s/                    # Kubernetes (Deployment, Service, Ingress, HPA)
│
├── docker-compose.yml          # Local multi-container development environment
├── forge.config.yaml           # Canonical architecture declaration (Single Source of Truth)
├── ARCHITECTURE.md             # Auto-generated living architecture documentation
├── architecture.mmd            # Native Mermaid.js architecture diagram
└── turbo.json                  # Turborepo task pipeline configuration
```

---

## 🛡️ Deterministic Validation Engine

ForgeStack prevents common production misconfigurations before they happen:

* 🚫 **Ephemeral Queue Mismatches**: Warns against running persistent BullMQ worker queues on ephemeral serverless platforms (AWS Lambda).
* 🚫 **Storage Disconnects**: Ensures database ORMs (`Prisma`, `Mongoose`) match appropriate database engines (`PostgreSQL`, `MongoDB`).
* 🚫 **Container Decoupling**: Automatically wires health checks (`/health/ready`, `/health/live`), Prometheus metrics (`/metrics`), and environment variables when services are added.
* 🚫 **IaC Synchronization**: Auto-generates Terraform variables and Kubernetes secrets matching active backend modules.

---

## 🧪 Development & Testing

```bash
# Clone the repository
git clone https://github.com/Sanskar225/forgestack.git
cd forgestack

# Install workspace dependencies
pnpm install

# Build all packages with Turborepo
pnpm run build

# Run comprehensive Vitest unit and integration test suites
pnpm run test
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">
  Built with ❤️ by <b><a href="https://github.com/Sanskar225">Sanskar Sinha</a></b>
</div>
