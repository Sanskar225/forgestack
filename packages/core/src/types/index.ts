export type ProjectType = 'fullstack' | 'frontend' | 'backend' | 'infrastructure';
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type FrontendFramework = 'nextjs' | 'react-vite' | 'vue' | 'svelte' | 'none';
export type FrontendLanguage = 'typescript' | 'javascript';
export type FrontendStyling = 'tailwind' | 'shadcn' | 'css-modules' | 'none';
export type FrontendState = 'zustand' | 'redux' | 'tanstack-query' | 'none';
export type FrontendApiClient = 'tanstack-query' | 'axios' | 'fetch';
export type FrontendDeployment = 'vercel' | 'aws' | 'docker' | 'kubernetes' | 'static';

export type BackendFramework = 'express' | 'fastify' | 'nestjs' | 'hono' | 'none';
export type BackendLanguage = 'typescript' | 'javascript';
export type BackendArchitecture = 'modular-monolith' | 'clean-architecture' | 'mvc';

export type DatabaseProvider = 'postgresql' | 'mysql' | 'mongodb' | 'dynamodb' | 'none';
export type DatabaseORM = 'prisma' | 'drizzle' | 'mongoose' | 'typeorm' | 'none';

export type CacheProvider = 'redis' | 'valkey' | 'elasticache' | 'none';
export type AuthStrategy = 'jwt' | 'oauth' | 'session' | 'none';
export type AuthFeature = 'refresh-tokens' | 'rate-limiting' | 'account-lockout' | 'oauth-google' | 'oauth-github';

export type QueueProvider = 'bullmq' | 'sqs' | 'rabbitmq' | 'none';
export type EventBroker = 'kafka' | 'rabbitmq' | 'sns-sqs' | 'redis-streams' | 'none';

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'local' | 'none';
export type AwsCompute = 'ecs' | 'eks' | 'ec2' | 'lambda' | 'none';
export type AwsDatabase = 'rds' | 'aurora' | 'dynamodb' | 'none';
export type AwsStorage = 's3' | 'efs';
export type AwsMessaging = 'sqs' | 'sns' | 'msk' | 'amazon-mq';
export type AwsNetworking = 'vpc' | 'alb' | 'nlb' | 'cloudfront' | 'route53';
export type AwsSecurity = 'iam' | 'kms' | 'secrets-manager';

export type IaCProvider = 'terraform' | 'kubernetes' | 'pulumi' | 'none';

export interface FrontendConfig {
  framework: FrontendFramework;
  language: FrontendLanguage;
  styling: FrontendStyling;
  state?: FrontendState;
  apiClient?: FrontendApiClient;
  deployment?: FrontendDeployment;
}

export interface BackendConfig {
  framework: BackendFramework;
  language: BackendLanguage;
  architecture: BackendArchitecture;
  port: number;
}

export interface DatabaseConfig {
  provider: DatabaseProvider;
  orm: DatabaseORM;
}

export interface CacheConfig {
  provider: CacheProvider;
}

export interface AuthConfig {
  strategy: AuthStrategy;
  features?: AuthFeature[];
}

export interface QueueConfig {
  provider: QueueProvider;
}

export interface AwsConfig {
  compute?: AwsCompute;
  database?: AwsDatabase;
  storage?: AwsStorage[];
  cache?: 'elasticache' | 'none';
  messaging?: AwsMessaging[];
  networking?: AwsNetworking[];
  security?: AwsSecurity[];
}

export interface InfrastructureConfig {
  cloud: CloudProvider;
  aws?: AwsConfig;
  iac: IaCProvider;
  kubernetes?: {
    ingress: boolean;
    hpa: boolean;
    monitoring: boolean;
    namespace?: string;
  };
}

export interface ObservabilityConfig {
  logging: 'pino' | 'winston' | 'none';
  metrics: 'prometheus' | 'cloudwatch' | 'none';
  tracing: 'opentelemetry' | 'xray' | 'none';
  errorTracking?: 'sentry' | 'none';
  healthChecks: boolean;
}

export interface ContainersConfig {
  docker: boolean;
  compose: boolean;
}

export interface CicdConfig {
  provider: 'github-actions' | 'gitlab-ci' | 'none';
}

export interface ProjectMeta {
  name: string;
  type: ProjectType;
  packageManager: PackageManager;
  version?: string;
  description?: string;
}

export interface ForgeConfig {
  version: string;
  project: ProjectMeta;
  frontend?: FrontendConfig;
  backend?: BackendConfig;
  database?: DatabaseConfig;
  cache?: CacheConfig;
  auth?: AuthConfig;
  queue?: QueueConfig;
  infrastructure?: InfrastructureConfig;
  observability?: ObservabilityConfig;
  containers?: ContainersConfig;
  cicd?: CicdConfig;
}

export interface ValidationIssue {
  code: string;
  level: 'error' | 'warning';
  message: string;
  recommendation?: string;
  autoFix?: (config: ForgeConfig) => ForgeConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface DependencyManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  envVariables: Record<string, { description: string; defaultValue?: string; required: boolean }>;
}
