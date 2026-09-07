import type { ForgeConfig } from '@sanskar225/core';
import type { GeneratedFile } from '../types.js';

export function generateKubernetesFiles(config: ForgeConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { infrastructure, backend } = config;

  if (infrastructure?.iac !== 'kubernetes') {
    return files;
  }

  const ns = infrastructure.kubernetes?.namespace || config.project.name;
  const port = backend?.port || 4000;

  // 1. namespace.yaml
  const namespaceYaml = `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    app.kubernetes.io/managed-by: forgestack
`;
  files.push({ path: 'infrastructure/k8s/namespace.yaml', content: namespaceYaml });

  // 2. configmap.yaml
  const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${config.project.name}-config
  namespace: ${ns}
data:
  NODE_ENV: "production"
  PORT: "${port}"
`;
  files.push({ path: 'infrastructure/k8s/configmap.yaml', content: configMapYaml });

  // 3. deployment.yaml
  const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.project.name}-api
  namespace: ${ns}
  labels:
    app: ${config.project.name}-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${config.project.name}-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: ${config.project.name}-api
    spec:
      containers:
        - name: api
          image: ${config.project.name}-api:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: ${port}
              name: http
          envFrom:
            - configMapRef:
                name: ${config.project.name}-config
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: ${port}
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: ${port}
            initialDelaySeconds: 5
            periodSeconds: 5
`;
  files.push({ path: 'infrastructure/k8s/api-deployment.yaml', content: deploymentYaml });

  // 4. service.yaml
  const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: ${config.project.name}-api-svc
  namespace: ${ns}
spec:
  type: ClusterIP
  selector:
    app: ${config.project.name}-api
  ports:
    - name: http
      port: 80
      targetPort: ${port}
`;
  files.push({ path: 'infrastructure/k8s/api-service.yaml', content: serviceYaml });

  // 5. hpa.yaml
  if (infrastructure.kubernetes?.hpa) {
    const hpaYaml = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${config.project.name}-api-hpa
  namespace: ${ns}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${config.project.name}-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75
`;
    files.push({ path: 'infrastructure/k8s/hpa.yaml', content: hpaYaml });
  }

  // 6. ingress.yaml
  if (infrastructure.kubernetes?.ingress) {
    const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${config.project.name}-ingress
  namespace: ${ns}
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${config.project.name}-api-svc
                port:
                  number: 80
`;
    files.push({ path: 'infrastructure/k8s/ingress.yaml', content: ingressYaml });
  }

  return files;
}
