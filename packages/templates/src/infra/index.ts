export function renderTerraformVpcTemplate(projectName: string) {
  return `resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${projectName}-vpc"
  }
}
`;
}

export function renderKubernetesDeploymentTemplate(appName: string, port: number) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
        - name: ${appName}
          image: ${appName}:latest
          ports:
            - containerPort: ${port}
`;
}
