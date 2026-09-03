import type { ForgeConfig } from '../types/index.js';

export function renderAsciiArchitecture(config: ForgeConfig): string {
  const lines: string[] = [];
  lines.push(`+--------------------------------------------------------------------+`);
  lines.push(`| ForgeStack Architecture: ${config.project.name.padEnd(41, ' ')} |`);
  lines.push(`+--------------------------------------------------------------------+`);
  lines.push(``);

  const isFullstack = config.project.type === 'fullstack';
  const hasFrontend = isFullstack || config.project.type === 'frontend';
  const hasBackend = isFullstack || config.project.type === 'backend';
  const hasDb = config.database && config.database.provider !== 'none';
  const hasCache = config.cache && config.cache.provider !== 'none';
  const hasQueue = config.queue && config.queue.provider === 'bullmq';
  const isAws = config.infrastructure?.cloud === 'aws';

  if (hasFrontend) {
    const fe = config.frontend?.framework || 'Next.js';
    const styling = config.frontend?.styling || 'Tailwind CSS';
    lines.push(`   [ Client / Browser ]`);
    lines.push(`            |`);
    lines.push(`            v`);
    if (isAws && config.infrastructure?.aws?.networking?.includes('cloudfront')) {
      lines.push(`   [ AWS CloudFront CDN ]`);
      lines.push(`            |`);
      lines.push(`            v`);
    }
    lines.push(`   [ Frontend: ${fe} (${styling}) ]`);
    lines.push(`            |`);
    lines.push(`            v (HTTP/REST API)`);
  }

  if (hasBackend) {
    const be = config.backend?.framework || 'Express';
    const arch = config.backend?.architecture || 'Modular Monolith';
    if (isAws && config.infrastructure?.aws?.networking?.includes('alb')) {
      lines.push(`   [ AWS Application Load Balancer ]`);
      lines.push(`            |`);
      lines.push(`            v`);
    }
    const computeTarget = isAws ? ` on AWS ${config.infrastructure?.aws?.compute?.toUpperCase() || 'ECS'}` : '';
    lines.push(`   [ Backend API: ${be}${computeTarget} (${arch}) ]`);
    lines.push(`      |            |            |`);
    lines.push(`      v            v            v`);

    const dbName = hasDb ? `${config.database?.provider?.toUpperCase()} (${config.database?.orm})` : 'No DB';
    const cacheName = hasCache ? `${config.cache?.provider?.toUpperCase()}` : 'No Cache';
    const obsName = config.observability?.metrics === 'prometheus' ? 'Prometheus + Pino' : 'Pino Logs';

    lines.push(` [ DB: ${dbName.padEnd(12)} ]  [ Cache: ${cacheName.padEnd(8)} ]  [ Telemetry: ${obsName} ]`);

    if (hasQueue) {
      lines.push(`                          |`);
      lines.push(`                          v`);
      lines.push(`                [ BullMQ Worker Process ]`);
    }
  } else if (config.project.type === 'infrastructure') {
    lines.push(`   [ Infrastructure Stack: ${config.infrastructure?.iac?.toUpperCase() || 'TERRAFORM'} ]`);
    if (isAws) {
      lines.push(`   Target Cloud: AWS (${config.infrastructure?.aws?.compute || 'ECS'} + RDS + S3 + VPC)`);
    } else if (config.infrastructure?.iac === 'kubernetes') {
      lines.push(`   Target: Kubernetes Cluster (Ingress, Services, Deployments, HPA)`);
    }
  }

  lines.push(``);
  lines.push(`+--------------------------------------------------------------------+`);
  return lines.join('\n');
}

export function generateMermaidDiagram(config: ForgeConfig): string {
  const lines: string[] = ['flowchart TD'];

  const isFullstack = config.project.type === 'fullstack';
  const hasFrontend = isFullstack || config.project.type === 'frontend';
  const hasBackend = isFullstack || config.project.type === 'backend';
  const hasDb = config.database && config.database.provider !== 'none';
  const hasCache = config.cache && config.cache.provider !== 'none';
  const hasQueue = config.queue && config.queue.provider === 'bullmq';
  const isAws = config.infrastructure?.cloud === 'aws';

  lines.push(`  User(["🧑‍💻 User / Client"])`);

  if (hasFrontend) {
    const feLabel = `${config.frontend?.framework?.toUpperCase() || 'FRONTEND'} (${config.frontend?.styling || 'Tailwind'})`;
    if (isAws && config.infrastructure?.aws?.networking?.includes('cloudfront')) {
      lines.push(`  CloudFront["☁️ AWS CloudFront CDN"]`);
      lines.push(`  User --> CloudFront`);
      lines.push(`  CloudFront --> Frontend["💻 ${feLabel}"]`);
    } else {
      lines.push(`  Frontend["💻 ${feLabel}"]`);
      lines.push(`  User --> Frontend`);
    }
  }

  if (hasBackend) {
    const beLabel = `${config.backend?.framework?.toUpperCase() || 'BACKEND'} (${config.backend?.architecture || 'Modular'})`;
    lines.push(`  Backend["⚙️ ${beLabel}"]`);

    if (hasFrontend) {
      if (isAws && config.infrastructure?.aws?.networking?.includes('alb')) {
        lines.push(`  ALB["⚖️ AWS ALB (Load Balancer)"]`);
        lines.push(`  Frontend -->|API Requests| ALB`);
        lines.push(`  ALB --> Backend`);
      } else {
        lines.push(`  Frontend -->|API Requests| Backend`);
      }
    } else {
      lines.push(`  User --> Backend`);
    }

    if (hasDb) {
      const dbLabel = `${config.database?.provider?.toUpperCase()} (${config.database?.orm})`;
      lines.push(`  DB[("🗄️ Database: ${dbLabel}")]`);
      lines.push(`  Backend -->|Query / Mutate| DB`);
    }

    if (hasCache) {
      const cacheLabel = `${config.cache?.provider?.toUpperCase()}`;
      lines.push(`  Cache[("⚡ Cache: ${cacheLabel}")]`);
      lines.push(`  Backend -->|Read / Write| Cache`);
    }

    if (hasQueue) {
      lines.push(`  Worker["📦 BullMQ Worker"]`);
      lines.push(`  Backend -->|Enqueue Job| Cache`);
      lines.push(`  Cache -->|Process Job| Worker`);
    }

    if (config.observability) {
      lines.push(`  Obs["📊 Telemetry (Pino + Prometheus + OTel)"]`);
      lines.push(`  Backend -.->|Metrics & Traces| Obs`);
    }
  }

  return lines.join('\n');
}

export function generateArchitectureDoc(config: ForgeConfig): string {
  const ascii = renderAsciiArchitecture(config);
  const mermaid = generateMermaidDiagram(config);

  return `# ${config.project.name} - Architecture Blueprint

> Generated deterministically by **[ForgeStack](https://github.com/Sanskar225/forgestack)**.
> **Canonical Configuration**: \`forge.config.yaml\`

---

## 🏗️ System Overview

- **Project Type**: \`${config.project.type}\`
- **Package Manager**: \`${config.project.packageManager}\`
- **Generated On**: ${new Date().toISOString()}

\`\`\`text
${ascii}
\`\`\`

---

## 📊 Component & Topology Diagram

\`\`\`mermaid
${mermaid}
\`\`\`

---

## 🧩 Architectural Specifications

### 1. Frontend
- **Framework**: \`${config.frontend?.framework || 'None'}\`
- **Language**: \`${config.frontend?.language || 'None'}\`
- **Styling**: \`${config.frontend?.styling || 'None'}\`
- **State Management**: \`${config.frontend?.state || 'None'}\`
- **API Client**: \`${config.frontend?.apiClient || 'None'}\`

### 2. Backend
- **Framework**: \`${config.backend?.framework || 'None'}\`
- **Language**: \`${config.backend?.language || 'None'}\`
- **Architecture Pattern**: \`${config.backend?.architecture || 'None'}\`
- **Port**: \`${config.backend?.port || 'None'}\`

### 3. Data & Storage
- **Database**: \`${config.database?.provider || 'None'}\`
- **ORM / Driver**: \`${config.database?.orm || 'None'}\`
- **Cache Provider**: \`${config.cache?.provider || 'None'}\`
- **Queue / Background Jobs**: \`${config.queue?.provider || 'None'}\`

### 4. Infrastructure & Cloud
- **Cloud Provider**: \`${config.infrastructure?.cloud || 'local'}\`
- **IaC Engine**: \`${config.infrastructure?.iac || 'None'}\`
${config.infrastructure?.aws ? `- **AWS Compute**: \`${config.infrastructure.aws.compute || 'None'}\`\n- **AWS Database**: \`${config.infrastructure.aws.database || 'None'}\`` : ''}

### 5. Observability & Quality
- **Logging**: \`${config.observability?.logging || 'None'}\`
- **Metrics**: \`${config.observability?.metrics || 'None'}\`
- **Tracing**: \`${config.observability?.tracing || 'None'}\`
- **Health Checks**: \`${config.observability?.healthChecks ? 'Enabled (/health, /live, /ready)' : 'Disabled'}\`
- **Containers**: Docker (\`${config.containers?.docker ? 'Yes' : 'No'}\`), Docker Compose (\`${config.containers?.compose ? 'Yes' : 'No'}\`)
- **CI/CD**: \`${config.cicd?.provider || 'None'}\`

---

## 🚀 Management Commands with \`forge\`

Inside this project directory, you can run:

\`\`\`bash
# Run environment & container diagnostics
forge doctor

# Validate architecture rules & constraints
forge validate

# View terminal topology & update diagram files
forge visualize

# Dynamically add architecture capabilities
forge add <module-name> # (e.g. forge add redis, forge add bullmq)

# Synchronize code from forge.config.yaml
forge generate
\`\`\`
`;
}
