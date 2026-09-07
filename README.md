# 🚀 ForgeStack

> **Architecture-aware CLI that generates production-ready frontend, backend, cloud infrastructure, deployment, monitoring, and CI/CD configurations from your requirements.**

[![npm version](https://img.shields.io/npm/v/@sanskar22/create-forgestack.svg?color=cb3837)](https://www.npmjs.com/package/@sanskar22/create-forgestack)
[![Turborepo](https://img.shields.io/badge/monorepo-turborepo-blue)](https://turbo.build)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📦 Published Packages on NPM Registry

| Package | Version | Description |
| :--- | :--- | :--- |
| [**`@sanskar22/create-forgestack`**](https://www.npmjs.com/package/@sanskar22/create-forgestack) | ![npm](https://img.shields.io/npm/v/@sanskar22/create-forgestack?color=red) | Global scaffolding CLI (`npx @sanskar22/create-forgestack`) |
| [**`@sanskar22/forge-cli`**](https://www.npmjs.com/package/@sanskar22/forge-cli) | ![npm](https://img.shields.io/npm/v/@sanskar22/forge-cli?color=red) | Local project manager binary (`forge` / `npx @sanskar22/forge-cli`) |
| [**`@sanskar22/core`**](https://www.npmjs.com/package/@sanskar22/core) | ![npm](https://img.shields.io/npm/v/@sanskar22/core?color=red) | Deterministic Architecture Engine & Rule Validator |
| [**`@sanskar22/templates`**](https://www.npmjs.com/package/@sanskar22/templates) | ![npm](https://img.shields.io/npm/v/@sanskar22/templates?color=red) | Modular skeletons & configs |
| [**`@sanskar22/generators`**](https://www.npmjs.com/package/@sanskar22/generators) | ![npm](https://img.shields.io/npm/v/@sanskar22/generators?color=red) | Code, Docker, Terraform & K8s emitters |

---

## ⚡ The Two-Tier Experience

### 1. Global Scaffold CLI
```bash
npx @sanskar22/create-forgestack [project-name]
```
Or scaffold directly with a production preset:
```bash
npx @sanskar22/create-forgestack my-app --preset saas
```

Available Presets:
- `saas`: Next.js + Express (Modular Monolith) + PostgreSQL (Prisma) + Redis + BullMQ + JWT Auth + AWS ECS / Terraform + Docker + Pino/Prometheus/OTel + GitHub Actions
- `minimal-api`: Fast Express + TypeScript + Health Checks + Pino Logging + Docker
- `infra-aws`: Pure AWS ECS + RDS PostgreSQL + S3 + Redis ElastiCache + Terraform + GitHub Actions
- `infra-k8s`: Kubernetes Deployments, Ingress, HPA, Probes, ConfigMaps + Docker

---

### 2. Local Architecture Manager CLI (`forge`)
Inside any generated project, manage your architecture dynamically using `forge.config.yaml` as the canonical source of truth:

```bash
# Verify runtime, containers, and database connectivity
npx forge doctor

# Validate architecture rules & constraint checks
npx forge validate

# Render terminal ASCII topology & update ARCHITECTURE.md + architecture.mmd
npx forge visualize

# Dynamically inject services with zero manual boilerplate
npx forge add redis
npx forge add bullmq
npx forge add auth
npx forge add s3
npx forge add terraform
npx forge add kubernetes

# Prune unneeded modules cleanly
npx forge remove bullmq

# Re-synchronize codebase from forge.config.yaml
npx forge generate

# Detect architectural drift
npx forge diff
```

---

## 🏗️ Monorepo Structure

```text
forgestack/
├── apps/
│   ├── create-forgestack/     # npx @sanskar22/create-forgestack CLI
│   └── forge-cli/             # Local project CLI binary ("forge")
│
├── packages/
│   ├── core/                  # Schema, Rule Validator, Zero-Bloat Resolver, Graph
│   └── generators/            # Backend, Frontend, DB, Docker, Terraform, K8s, CI/CD
│
└── tests/                     # Comprehensive Vitest unit & integration suites
```

---

## 🧪 Development & Testing

```bash
# Install dependencies across all packages
npm install

# Build all packages with Turborepo
npm run build

# Run comprehensive test suites
npm run test
```

---

## 📄 License
MIT © [Sanskar Sinha](https://github.com/Sanskar225)
