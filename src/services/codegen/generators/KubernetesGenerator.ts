// ─── KubernetesGenerator.ts ──────────────────────────────────────────────────
// Gera manifests Kubernetes (Deployment + Service + Ingress) a partir de diagramas.

import type {
  CanvasDiagram,
  CanvasComponent,
  GeneratedArtifact,
} from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

const K8S_IMAGES: Record<string, string> = {
  "rest-api": "node:20-alpine",
  "graphql-api": "node:20-alpine",
  microservice: "node:20-alpine",
  monolith: "node:20-alpine",
  bff: "node:20-alpine",
  worker: "node:20-alpine",
  "auth-service": "node:20-alpine",
  "websocket-server": "node:20-alpine",
  "database-sql": "postgres:16-alpine",
  "database-nosql": "mongo:7",
  cache: "redis:7-alpine",
  "message-queue": "rabbitmq:3-management-alpine",
  "reverse-proxy": "nginx:alpine",
  "api-gateway": "kong:3.6",
};

const RESOURCE_LIMITS: Record<string, { cpu: string; memory: string }> = {
  "database-sql": { cpu: "500m", memory: "512Mi" },
  "database-nosql": { cpu: "500m", memory: "512Mi" },
  cache: { cpu: "200m", memory: "256Mi" },
  "message-queue": { cpu: "300m", memory: "384Mi" },
  microservice: { cpu: "250m", memory: "256Mi" },
  "rest-api": { cpu: "250m", memory: "256Mi" },
  "graphql-api": { cpu: "250m", memory: "256Mi" },
  monolith: { cpu: "1000m", memory: "1024Mi" },
  worker: { cpu: "200m", memory: "256Mi" },
  "api-gateway": { cpu: "300m", memory: "256Mi" },
};

const DEFAULT_PORTS: Record<string, number> = {
  "rest-api": 3000,
  "graphql-api": 4000,
  microservice: 3000,
  monolith: 8080,
  bff: 3000,
  "websocket-server": 3001,
  "auth-service": 8443,
  "database-sql": 5432,
  "database-nosql": 27017,
  cache: 6379,
  "message-queue": 5672,
  "reverse-proxy": 80,
  "api-gateway": 8000,
};

// ═══════════════════════════════════════════════════════════════════════════════

function sanitize(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "app"
  );
}

function generateDeployment(comp: CanvasComponent): string {
  const name = sanitize(comp.label);
  const image = K8S_IMAGES[comp.type] ?? "alpine:latest";
  const port = comp.port ?? DEFAULT_PORTS[comp.type] ?? 3000;
  const replicas = comp.replicas ?? 1;
  const limits = RESOURCE_LIMITS[comp.type] ?? { cpu: "250m", memory: "256Mi" };

  return `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  labels:
    app: ${name}
    generated-by: netbuilder-academy
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
        - name: ${name}
          image: ${image}
          ports:
            - containerPort: ${port}
          resources:
            requests:
              cpu: "${limits.cpu}"
              memory: "${limits.memory}"
            limits:
              cpu: "${limits.cpu}"
              memory: "${limits.memory}"
          readinessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 10
            periodSeconds: 5
`;
}

function generateService(comp: CanvasComponent): string {
  const name = sanitize(comp.label);
  const port = comp.port ?? DEFAULT_PORTS[comp.type] ?? 3000;
  const type = ["load-balancer", "api-gateway", "reverse-proxy"].includes(
    comp.type,
  )
    ? "LoadBalancer"
    : "ClusterIP";

  return `---
apiVersion: v1
kind: Service
metadata:
  name: ${name}-svc
spec:
  type: ${type}
  selector:
    app: ${name}
  ports:
    - port: ${port}
      targetPort: ${port}
      protocol: TCP
`;
}

// ═══════════════════════════════════════════════════════════════════════════════

export function generateKubernetes(diagram: CanvasDiagram): GeneratedArtifact {
  const skipTypes = new Set([
    "browser",
    "mobile-app",
    "cdn",
    "static-site",
    "dns",
    "firewall-waf",
    "ci-cd",
    "container",
    "orchestrator",
  ]);
  const services = diagram.components.filter((c) => !skipTypes.has(c.type));

  const header = [
    "# ─────────────────────────────────────────────────────────────────",
    `# Kubernetes Manifests — gerado por NetBuilder Academy`,
    `# Diagrama: ${sanitize(diagram.name)}`,
    `# Componentes: ${services.length} workloads`,
    `# Gerado em: ${new Date().toISOString()}`,
    "# ─────────────────────────────────────────────────────────────────",
    "",
  ].join("\n");

  const manifests = services.flatMap((c) => [
    generateDeployment(c),
    generateService(c),
  ]);

  return {
    type: "kubernetes",
    filename: "k8s-manifests.yaml",
    content: header + manifests.join("\n"),
    language: "yaml",
  };
}
