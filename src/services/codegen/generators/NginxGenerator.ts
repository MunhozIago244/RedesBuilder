// ─── NginxGenerator.ts ───────────────────────────────────────────────────────
// Gera configuração Nginx a partir de load balancers e rotas do diagrama.

import type {
  CanvasDiagram,
  CanvasComponent,
  GeneratedArtifact,
} from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

function sanitize(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || "app"
  );
}

export function generateNginx(diagram: CanvasDiagram): GeneratedArtifact {
  const lines: string[] = [];
  const lbs = diagram.components.filter((c) =>
    ["load-balancer", "reverse-proxy", "api-gateway"].includes(c.type),
  );

  const backends = diagram.components.filter((c) =>
    [
      "rest-api",
      "graphql-api",
      "microservice",
      "monolith",
      "bff",
      "websocket-server",
      "auth-service",
    ].includes(c.type),
  );

  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push(`# Nginx Configuration — gerado por NetBuilder Academy`);
  lines.push(`# Diagrama: ${diagram.name}`);
  lines.push(
    "# ─────────────────────────────────────────────────────────────────",
  );
  lines.push("");

  // Worker config
  lines.push("worker_processes auto;");
  lines.push("events { worker_connections 1024; }");
  lines.push("");
  lines.push("http {");
  lines.push("    include       mime.types;");
  lines.push("    default_type  application/octet-stream;");
  lines.push("    sendfile      on;");
  lines.push("    keepalive_timeout 65;");
  lines.push("");

  // Upstream blocks for each backend
  if (backends.length > 0) {
    for (const backend of backends) {
      const name = sanitize(backend.label);
      const port = backend.port ?? 3000;
      const replicas = backend.replicas ?? 1;

      lines.push(`    # Upstream: ${backend.label}`);
      lines.push(`    upstream ${name}_backend {`);

      if (replicas > 1) {
        lines.push("        least_conn;");
        for (let i = 0; i < replicas; i++) {
          lines.push(`        server ${name}-${i}:${port};`);
        }
      } else {
        lines.push(`        server ${name}:${port};`);
      }

      lines.push("    }");
      lines.push("");
    }
  }

  // HTTPS detection
  const hasHttps = diagram.connections.some((c) => c.protocol === "HTTPS");

  // Server block
  lines.push("    server {");
  lines.push("        listen 80;");
  lines.push("        server_name _;");
  lines.push("");

  if (hasHttps) {
    lines.push("        # Redirect HTTP → HTTPS");
    lines.push("        # listen 443 ssl;");
    lines.push("        # ssl_certificate     /etc/nginx/ssl/cert.pem;");
    lines.push("        # ssl_certificate_key /etc/nginx/ssl/key.pem;");
    lines.push("");
  }

  // Location blocks based on connections from LB to backends
  if (lbs.length > 0 && backends.length > 0) {
    // Each backend connected to a LB gets a location
    for (const backend of backends) {
      const name = sanitize(backend.label);
      const isConnected =
        diagram.connections.some(
          (c) =>
            lbs.some((lb) => lb.id === c.sourceId) && c.targetId === backend.id,
        ) ||
        diagram.connections.some(
          (c) =>
            lbs.some((lb) => lb.id === c.targetId) && c.sourceId === backend.id,
        );

      if (isConnected || backends.length <= 3) {
        const path =
          backend.type === "graphql-api"
            ? "/graphql"
            : backend.type === "websocket-server"
              ? "/ws"
              : backend.type === "auth-service"
                ? "/auth"
                : `/${name}`;

        lines.push(
          `        # → ${backend.label} (${backend.technology ?? backend.type})`,
        );
        lines.push(`        location ${path} {`);
        lines.push(`            proxy_pass http://${name}_backend;`);
        lines.push("            proxy_set_header Host $host;");
        lines.push("            proxy_set_header X-Real-IP $remote_addr;");
        lines.push(
          "            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        );
        lines.push("            proxy_set_header X-Forwarded-Proto $scheme;");

        if (backend.type === "websocket-server") {
          lines.push("            proxy_http_version 1.1;");
          lines.push("            proxy_set_header Upgrade $http_upgrade;");
          lines.push('            proxy_set_header Connection "upgrade";');
        }

        lines.push("        }");
        lines.push("");
      }
    }
  } else {
    lines.push("        location / {");
    lines.push("            return 200 'NetBuilder Academy - OK';");
    lines.push("            add_header Content-Type text/plain;");
    lines.push("        }");
  }

  // Health check
  lines.push("        location /health {");
  lines.push("            access_log off;");
  lines.push("            return 200 'healthy';");
  lines.push("            add_header Content-Type text/plain;");
  lines.push("        }");

  lines.push("    }");
  lines.push("}");

  return {
    type: "nginx",
    filename: "nginx.conf",
    content: lines.join("\n"),
    language: "nginx",
  };
}
