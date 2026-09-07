import * as p from '@clack/prompts';
import pc from 'picocolors';
import type {
  ForgeConfig,
  ProjectType,
  FrontendFramework,
  FrontendState,
  FrontendApiClient,
  BackendFramework,
  BackendArchitecture,
  CacheProvider,
  AuthStrategy,
  CloudProvider,
  AwsCompute,
  AwsDatabase,
  AwsConfig,
  IaCProvider,
} from '@sanskar225/core';

export async function promptUserConfig(initialName?: string): Promise<ForgeConfig> {
  p.intro(pc.bgCyan(pc.black(' 🚀 ForgeStack: Architecture-Aware Generator ')));

  // 1. Project Name
  const name = initialName || ((await p.text({
    message: 'What is your project name?',
    placeholder: 'my-production-app',
    defaultValue: 'my-production-app',
    validate: (val) => (!val.trim() ? 'Project name is required' : undefined),
  })) as string);

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // 2. Project Type (Question 1)
  const projectType = (await p.select({
    message: 'What do you want to build?',
    options: [
      { value: 'fullstack', label: 'Full-Stack Application', hint: 'Monorepo: Frontend + Backend + Shared Packages + Infra' },
      { value: 'backend', label: 'Backend Only', hint: 'Modular API / Microservice + DB + Cache + Workers' },
      { value: 'frontend', label: 'Frontend Only', hint: 'Next.js or React + Tailwind + State' },
      { value: 'infrastructure', label: 'Infrastructure Only', hint: 'Terraform, AWS Architecture & Kubernetes Manifests' },
    ],
  })) as ProjectType;

  if (p.isCancel(projectType)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const isFullstack = projectType === 'fullstack';
  const hasFrontend = isFullstack || projectType === 'frontend';
  const hasBackend = isFullstack || projectType === 'backend';

  // 3. Frontend Questions
  let frontendConfig: ForgeConfig['frontend'] = undefined;
  if (hasFrontend) {
    const framework = (await p.select({
      message: 'Select Frontend Framework:',
      options: [
        { value: 'nextjs', label: 'Next.js (App Router)', hint: 'Production React Framework' },
        { value: 'react-vite', label: 'React + Vite', hint: 'Fast Single Page Application' },
      ],
    })) as FrontendFramework;

    if (p.isCancel(framework)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    const styling = (await p.select({
      message: 'Select Styling System:',
      options: [
        { value: 'tailwind', label: 'Tailwind CSS', hint: 'Modern utility-first CSS' },
        { value: 'shadcn', label: 'shadcn/ui + Tailwind', hint: 'Accessible component primitives' },
        { value: 'none', label: 'Vanilla CSS', hint: 'Plain CSS stylesheets' },
      ],
    })) as any;

    if (p.isCancel(styling)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    const state = (await p.select({
      message: 'Select State Management:',
      options: [
        { value: 'zustand', label: 'Zustand', hint: 'Lightweight reactive store' },
        { value: 'redux', label: 'Redux Toolkit', hint: 'Predictable centralized store' },
        { value: 'tanstack-query', label: 'TanStack Query', hint: 'Server state management' },
        { value: 'none', label: 'None (React state only)', hint: 'useState / useReducer' },
      ],
    })) as FrontendState;

    if (p.isCancel(state)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    const apiClient = (await p.select({
      message: 'Select API Client:',
      options: [
        { value: 'tanstack-query', label: 'TanStack Query (Fetch)', hint: 'Async data synchronization' },
        { value: 'axios', label: 'Axios', hint: 'Promise-based HTTP client' },
        { value: 'fetch', label: 'Native Fetch', hint: 'Standard Web API' },
      ],
    })) as FrontendApiClient;

    if (p.isCancel(apiClient)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    frontendConfig = {
      framework,
      language: 'typescript',
      styling,
      state,
      apiClient,
    };
  }

  // 4. Backend Questions
  let backendConfig: ForgeConfig['backend'] = undefined;
  let databaseConfig: ForgeConfig['database'] = undefined;
  let cacheConfig: ForgeConfig['cache'] = undefined;
  let authConfig: ForgeConfig['auth'] = undefined;
  let queueConfig: ForgeConfig['queue'] = undefined;

  if (hasBackend) {
    const framework = (await p.select({
      message: 'Select Backend Framework:',
      options: [
        { value: 'express', label: 'Express.js', hint: 'Classic, highly extensible Node framework' },
        { value: 'fastify', label: 'Fastify', hint: 'High-performance, low overhead framework' },
      ],
    })) as BackendFramework;

    if (p.isCancel(framework)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    const architecture = (await p.select({
      message: 'Select Backend Architecture Pattern:',
      options: [
        { value: 'modular-monolith', label: 'Modular Monolith', hint: 'Domain modules with encapsulated services & routes' },
        { value: 'clean-architecture', label: 'Clean Architecture', hint: 'Separation into Entities, Use Cases, Repositories' },
        { value: 'mvc', label: 'MVC (Model-View-Controller)', hint: 'Traditional layered structure' },
      ],
    })) as BackendArchitecture;

    if (p.isCancel(architecture)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    backendConfig = {
      framework,
      language: 'typescript',
      architecture,
      port: 4000,
    };

    // Database & ORM
    const dbSelection = (await p.select({
      message: 'Select Database & ORM:',
      options: [
        { value: 'postgres-prisma', label: 'PostgreSQL + Prisma ORM', hint: 'Type-safe SQL schemas & migrations' },
        { value: 'postgres-drizzle', label: 'PostgreSQL + Drizzle ORM', hint: 'Lightweight SQL query builder' },
        { value: 'mongo-mongoose', label: 'MongoDB + Mongoose', hint: 'NoSQL document schema modeling' },
        { value: 'none', label: 'None', hint: 'Stateless / in-memory only' },
      ],
    })) as string;

    if (p.isCancel(dbSelection)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    if (dbSelection === 'postgres-prisma') {
      databaseConfig = { provider: 'postgresql', orm: 'prisma' };
    } else if (dbSelection === 'postgres-drizzle') {
      databaseConfig = { provider: 'postgresql', orm: 'drizzle' };
    } else if (dbSelection === 'mongo-mongoose') {
      databaseConfig = { provider: 'mongodb', orm: 'mongoose' };
    } else {
      databaseConfig = { provider: 'none', orm: 'none' };
    }

    // Cache
    const needsCache = (await p.confirm({
      message: 'Do you need a Redis Caching layer?',
      initialValue: true,
    })) as boolean;

    if (p.isCancel(needsCache)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    cacheConfig = { provider: needsCache ? 'redis' : 'none' };

    // Auth
    const needsAuth = (await p.confirm({
      message: 'Include JWT Authentication (Access + Refresh tokens + Bcrypt)?',
      initialValue: true,
    })) as boolean;

    if (p.isCancel(needsAuth)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    authConfig = {
      strategy: needsAuth ? 'jwt' : 'none',
      features: needsAuth ? ['refresh-tokens', 'rate-limiting'] : undefined,
    };

    // Queues
    const needsQueue = (await p.confirm({
      message: 'Include BullMQ Background Job Processing Worker?',
      initialValue: true,
    })) as boolean;

    if (p.isCancel(needsQueue)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    queueConfig = { provider: needsQueue ? 'bullmq' : 'none' };
  }

  // 5. Cloud & Infrastructure Questions
  let infrastructureConfig: ForgeConfig['infrastructure'] = undefined;

  const cloudProvider = (await p.select({
    message: 'Select Cloud / Deployment Target:',
    options: [
      { value: 'aws', label: 'Amazon Web Services (AWS)', hint: 'ECS, RDS, S3, ElastiCache, VPC' },
      { value: 'local', label: 'Local / Docker / Self-Hosted', hint: 'Docker Compose & Bare Metal' },
    ],
  })) as CloudProvider;

  if (p.isCancel(cloudProvider)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  let awsConfig: AwsConfig | undefined = undefined;
  if (cloudProvider === 'aws') {
    const compute = (await p.select({
      message: 'Select AWS Compute Service:',
      options: [
        { value: 'ecs', label: 'AWS ECS (Fargate)', hint: 'Serverless container orchestration' },
        { value: 'eks', label: 'AWS EKS (Elastic Kubernetes)', hint: 'Managed Kubernetes on AWS' },
        { value: 'ec2', label: 'AWS EC2', hint: 'Virtual machine instances' },
        { value: 'lambda', label: 'AWS Lambda', hint: 'Serverless event functions' },
      ],
    })) as AwsCompute;

    if (p.isCancel(compute)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    const awsDb = (await p.select({
      message: 'Select AWS Database Service:',
      options: [
        { value: 'rds', label: 'AWS RDS (PostgreSQL)', hint: 'Managed relational DB' },
        { value: 'aurora', label: 'AWS Aurora Serverless', hint: 'High availability auto-scaling DB' },
        { value: 'dynamodb', label: 'AWS DynamoDB', hint: 'NoSQL key-value database' },
        { value: 'none', label: 'External / None', hint: 'Self-hosted or external cluster' },
      ],
    })) as AwsDatabase;

    if (p.isCancel(awsDb)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    awsConfig = {
      compute,
      database: awsDb,
      storage: ['s3'],
      cache: cacheConfig?.provider === 'redis' ? 'elasticache' : 'none',
      networking: ['vpc', 'alb'],
      security: ['iam'],
    };
  }

  const iac = (await p.select({
    message: 'Select Infrastructure as Code (IaC) Engine:',
    options: [
      { value: 'terraform', label: 'Terraform (HCL)', hint: 'Modular AWS VPC, Compute, DB & Storage' },
      { value: 'kubernetes', label: 'Kubernetes Manifests (YAML)', hint: 'Deployments, Ingress, HPA, Probes' },
      { value: 'none', label: 'None (Docker only)', hint: 'Rely purely on Docker Compose' },
    ],
  })) as IaCProvider;

  if (p.isCancel(iac)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  infrastructureConfig = {
    cloud: cloudProvider,
    aws: awsConfig,
    iac,
    kubernetes: iac === 'kubernetes' ? { ingress: true, hpa: true, monitoring: true, namespace: name } : undefined,
  };

  return {
    version: '1.0',
    project: {
      name,
      type: projectType,
      packageManager: 'pnpm',
      version: '0.1.0',
    },
    frontend: frontendConfig,
    backend: backendConfig,
    database: databaseConfig,
    cache: cacheConfig,
    auth: authConfig,
    queue: queueConfig,
    infrastructure: infrastructureConfig,
    observability: {
      logging: 'pino',
      metrics: 'prometheus',
      tracing: 'opentelemetry',
      healthChecks: true,
    },
    containers: {
      docker: true,
      compose: true,
    },
    cicd: {
      provider: 'github-actions',
    },
  };
}
