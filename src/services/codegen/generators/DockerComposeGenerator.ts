// ─── DockerComposeGenerator.ts ───────────────────────────────────────────────
// Gera docker-compose.yml funcional a partir de diagramas do Architecture Builder.

import type {
  CanvasDiagram,
  CanvasComponent,
  CanvasConnection,
  GeneratedArtifact,
} from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

const SERVICE_IMAGES: Record<string, string> = {
  "rest-api": "node:20-alpine",
  "graphql-api": "node:20-alpine",
  "spa-app": "node:20-alpine",
  microservice: "node:20-alpine",
  monolith: "node:20-alpine",
  bff: "node:20-alpine",
  worker: "node:20-alpine",
  "auth-service": "node:20-alpine",
  "websocket-server": "node:20-alpine",
  "serverless-fn": "node:20-alpine",
  "database-sql": "postgres:16-alpine",
  "database-nosql": "mongo:7",
  cache: "redis:7-alpine",
  "search-engine": "elasticsearch:8.12.0",
  "message-queue": "rabbitmq:3-management-alpine",
  "event-bus": "confluentinc/cp-kafka:7.6.0",
  "pub-sub": "redis:7-alpine",
  "reverse-proxy": "nginx:alpine",
  "load-balancer": "nginx:alpine",
  "api-gateway": "kong:3.6",
  "object-storage": "minio/minio:latest",
};

const DEFAULT_PORTS: Record<string, number> = {
  "rest-api": 3000,
  "graphql-api": 4000,
  "spa-app": 3000,
  microservice: 3000,
  monolith: 8080,
  bff: 3000,
  "websocket-server": 3001,
  worker: 0,
  "auth-service": 8443,
  "serverless-fn": 9000,
  "database-sql": 5432,
  "database-nosql": 27017,
  cache: 6379,
  "search-engine": 9200,
  "message-queue": 5672,
  "event-bus": 9092,
  "pub-sub": 6379,
  "reverse-proxy": 80,
  "load-balancer": 80,
  "api-gateway": 8000,
  "object-storage": 9000,
};

const DB_ENVS: Record<string, string[]> = {
  "database-sql": [
    "POSTGRES_USER=app_user",
    "POSTGRES_PASSWORD=changeme",
    "POSTGRES_DB=app_db",
  ],
  "database-nosql": [
    "MONGO_INITDB_ROOT_USERNAME=admin",
    "MONGO_INITDB_ROOT_PASSWORD=changeme",
  ],
  cache: [],
  "search-engine": [
    "discovery.type=single-node",
    "xpack.security.enabled=false",
    "ES_JAVA_OPTS=-Xms512m -Xmx512m",
  ],
  "message-queue": [
    "RABBITMQ_DEFAULT_USER=admin",
    "RABBITMQ_DEFAULT_PASS=changeme",
  ],
  "object-storage": ["MINIO_ROOT_USER=minio", "MINIO_ROOT_PASSWORD=changeme"],
};

const HEALTH_CHECKS: Record<
  string,
  { test: string; interval: string; timeout: string; retries: number }
> = {
  "database-sql": {
    test: "pg_isready -U app_user -d app_db",
    interval: "10s",
    timeout: "5s",
    retries: 5,
  },
  "database-nosql": {
    test: "mongosh --eval \"db.adminCommand('ping')\"",
    interval: "10s",
    timeout: "5s",
    retries: 5,
  },
  cache: {
    test: "redis-cli ping | grep PONG",
    interval: "10s",
    timeout: "3s",
    retries: 3,
  },
  "message-queue": {
    test: "rabbitmq-diagnostics -q check_running",
    interval: "15s",
    timeout: "10s",
    retries: 5,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeName(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "service"
  );
}

function getVolumeName(comp: CanvasComponent): string | null {
  const dataTypes = [
    "database-sql",
    "database-nosql",
    "cache",
    "search-engine",
    "object-storage",
    "message-queue",
  ];
  if (dataTypes.includes(comp.type)) return `${sanitizeName(comp.label)}_data`;
  return null;
}

function getDependsOn(
  comp: CanvasComponent,
  connections: CanvasConnection[],
  allComps: CanvasComponent[],
): string[] {
  const deps: string[] = [];
  const dataTypes = [
    "database-sql",
    "database-nosql",
    "cache",
    "search-engine",
    "message-queue",
    "event-bus",
  ];

  for (const conn of connections) {
    if (conn.sourceId === comp.id) {
      const target = allComps.find((c) => c.id === conn.targetId);
      if (target && dataTypes.includes(target.type)) {
        deps.push(sanitizeName(target.label));
      }
    }
  }
  return deps;
}

// ═══════════════════════════════════════════════════════════════════════════════

export function generateDockerCompose(
  diagram: CanvasDiagram,
): GeneratedArtifact {
  const lines: string[] = [];
  const volumes: string[] = [];
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

  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push(`# Docker Compose — gerado por NetBuilder Academy`);
  lines.push(`# Diagrama: ${sanitizeName(diagram.name)}`);
  lines.push(`# Componentes: ${services.length} serviços`);
  lines.push(`# Gerado em: ${new Date().toISOString()}`);
  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push("");
  lines.push("version: '3.8'");
  lines.push("");
  lines.push("services:");

  for (const comp of services) {
    const name = sanitizeName(comp.label);
    const image = SERVICE_IMAGES[comp.type] ?? "alpine:latest";
    const port = comp.port ?? DEFAULT_PORTS[comp.type] ?? 0;
    const envVars = DB_ENVS[comp.type];
    const healthCheck = HEALTH_CHECKS[comp.type];
    const volumeName = getVolumeName(comp);
    const deps = getDependsOn(comp, diagram.connections, diagram.components);

    if (volumeName) volumes.push(volumeName);

    lines.push(`  ${name}:`);
    lines.push(`    image: ${image}`);
    lines.push(`    container_name: ${name}`);

    if (comp.type === "object-storage") {
      lines.push(`    command: server /data --console-address ":9001"`);
    }

    if (port > 0) {
      lines.push(`    ports:`);
      lines.push(`      - "${port}:${port}"`);
      if (comp.type === "message-queue") {
        lines.push(`      - "15672:15672"  # Management UI`);
      }
    }

    if (envVars && envVars.length > 0) {
      lines.push(`    environment:`);
      for (const env of envVars) {
        lines.push(`      - ${env}`);
      }
    }

    if (volumeName) {
      const mountPath: Record<string, string> = {
        "database-sql": "/var/lib/postgresql/data",
        "database-nosql": "/data/db",
        cache: "/data",
        "search-engine": "/usr/share/elasticsearch/data",
        "object-storage": "/data",
        "message-queue": "/var/lib/rabbitmq",
      };
      lines.push(`    volumes:`);
      lines.push(`      - ${volumeName}:${mountPath[comp.type] ?? "/data"}`);
    }

    if (healthCheck) {
      lines.push(`    healthcheck:`);
      lines.push(`      test: ["CMD-SHELL", "${healthCheck.test}"]`);
      lines.push(`      interval: ${healthCheck.interval}`);
      lines.push(`      timeout: ${healthCheck.timeout}`);
      lines.push(`      retries: ${healthCheck.retries}`);
    }

    if (deps.length > 0) {
      lines.push(`    depends_on:`);
      for (const dep of deps) {
        lines.push(`      ${dep}:`);
        lines.push(`        condition: service_started`);
      }
    }

    lines.push(`    networks:`);
    lines.push(`      - app-network`);
    lines.push(`    restart: unless-stopped`);
    lines.push("");
  }

  // Networks
  lines.push("networks:");
  lines.push("  app-network:");
  lines.push("    driver: bridge");
  lines.push("");

  // Volumes
  if (volumes.length > 0) {
    lines.push("volumes:");
    for (const v of volumes) {
      lines.push(`  ${v}:`);
      lines.push(`    driver: local`);
    }
  }

  return {
    type: "docker-compose",
    filename: "docker-compose.yml",
    content: lines.join("\n"),
    language: "yaml",
  };
}
