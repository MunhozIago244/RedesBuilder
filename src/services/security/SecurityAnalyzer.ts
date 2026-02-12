// ─── SecurityAnalyzer.ts ─────────────────────────────────────────────────────
// Motor de regras de segurança para diagramas de rede e arquitetura.
// Analisa componentes + conexões e gera findings + score.

import type {
  CanvasDiagram,
  SecurityFinding,
  SecurityReport,
  Severity,
} from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

type Rule = {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  check: (diagram: CanvasDiagram) => SecurityFinding[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGRAS DE REDE
// ═══════════════════════════════════════════════════════════════════════════════

const networkRules: Rule[] = [
  {
    id: "NET-001",
    name: "Banco de dados exposto à internet",
    category: "network",
    severity: "critical",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const dbs = d.components.filter((c) =>
        ["database-sql", "database-nosql", "server"].includes(c.type),
      );
      for (const db of dbs) {
        const hasFirewall = d.connections.some(
          (c) =>
            (c.targetId === db.id || c.sourceId === db.id) &&
            d.components.some(
              (cp) =>
                (cp.id === c.sourceId || cp.id === c.targetId) &&
                ["firewall", "firewall-waf"].includes(cp.type),
            ),
        );
        if (!hasFirewall) {
          findings.push({
            id: `NET-001-${db.id}`,
            ruleId: "NET-001",
            severity: "critical",
            category: "network",
            title: `${db.label} sem firewall`,
            description: `O componente "${db.label}" não tem firewall entre ele e a rede externa. Bancos de dados devem estar protegidos por firewall ou em subnet privada.`,
            affectedComponents: [db.id],
            recommendation:
              "Adicione um Firewall ou WAF entre a rede externa e este componente.",
          });
        }
      }
      return findings;
    },
  },
  {
    id: "NET-002",
    name: "IoT sem segmentação",
    category: "network",
    severity: "high",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const iotTypes = [
        "smart-sensor",
        "ip-camera",
        "smart-thermostat",
        "smart-plug",
        "smart-speaker",
        "iot-gateway",
        "smart-lock",
        "smart-display",
      ];
      const iotDevices = d.components.filter((c) => iotTypes.includes(c.type));
      const hasSegmentation = d.components.some((c) =>
        ["firewall", "firewall-waf", "switch-l3"].includes(c.type),
      );

      if (iotDevices.length > 0 && !hasSegmentation) {
        findings.push({
          id: "NET-002-iot",
          ruleId: "NET-002",
          severity: "high",
          category: "network",
          title: "Dispositivos IoT sem segmentação de rede",
          description: `${iotDevices.length} dispositivos IoT encontrados sem segmentação de rede. IoT deve ser isolado em VLAN/sub-rede separada.`,
          affectedComponents: iotDevices.map((d) => d.id),
          recommendation:
            "Crie uma VLAN dedicada para IoT com um Switch L3 ou Firewall separando do restante da rede.",
        });
      }
      return findings;
    },
  },
  {
    id: "NET-003",
    name: "Comunicação sem criptografia",
    category: "encryption",
    severity: "high",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const unsafeConns = d.connections.filter(
        (c) =>
          c.protocol === "HTTP" ||
          c.protocol === "AMQP" ||
          c.protocol === "TCP",
      );
      for (const conn of unsafeConns) {
        const src = d.components.find((c) => c.id === conn.sourceId);
        const tgt = d.components.find((c) => c.id === conn.targetId);
        if (src && tgt) {
          findings.push({
            id: `NET-003-${conn.sourceId}-${conn.targetId}`,
            ruleId: "NET-003",
            severity: "high",
            category: "encryption",
            title: `Conexão ${src.label} → ${tgt.label} sem TLS`,
            description: `A conexão usa protocolo ${conn.protocol ?? "desconhecido"} sem criptografia. Dados em trânsito podem ser interceptados.`,
            affectedComponents: [conn.sourceId, conn.targetId],
            recommendation: `Use HTTPS, TLS ou mTLS em vez de ${conn.protocol ?? "texto puro"}.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "NET-004",
    name: "Ponto único de falha",
    category: "availability",
    severity: "medium",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const criticalTypes = [
        "database-sql",
        "database-nosql",
        "api-gateway",
        "load-balancer",
        "message-queue",
        "event-bus",
      ];
      for (const comp of d.components) {
        if (
          criticalTypes.includes(comp.type) &&
          (!comp.replicas || comp.replicas <= 1)
        ) {
          findings.push({
            id: `NET-004-${comp.id}`,
            ruleId: "NET-004",
            severity: "medium",
            category: "availability",
            title: `${comp.label} sem redundância`,
            description: `"${comp.label}" (${comp.type}) é um ponto único de falha. Se falhar, o sistema todo é afetado.`,
            affectedComponents: [comp.id],
            recommendation:
              "Configure réplicas ou failover automático para garantir alta disponibilidade.",
          });
        }
      }
      return findings;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REGRAS DE ARQUITETURA
// ═══════════════════════════════════════════════════════════════════════════════

const archRules: Rule[] = [
  {
    id: "ARCH-001",
    name: "Frontend acessando banco diretamente",
    category: "architecture",
    severity: "critical",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const frontends = d.components.filter((c) =>
        ["spa-app", "browser", "mobile-app", "static-site"].includes(c.type),
      );
      const databases = d.components.filter((c) =>
        ["database-sql", "database-nosql"].includes(c.type),
      );
      for (const fe of frontends) {
        for (const db of databases) {
          const direct = d.connections.some(
            (c) =>
              (c.sourceId === fe.id && c.targetId === db.id) ||
              (c.sourceId === db.id && c.targetId === fe.id),
          );
          if (direct) {
            findings.push({
              id: `ARCH-001-${fe.id}-${db.id}`,
              ruleId: "ARCH-001",
              severity: "critical",
              category: "architecture",
              title: `${fe.label} acessa ${db.label} diretamente`,
              description:
                "Frontend nunca deve acessar banco de dados diretamente. Isso expõe credenciais do DB e bypassa toda a lógica de negócio.",
              affectedComponents: [fe.id, db.id],
              recommendation:
                "Adicione uma API (REST/GraphQL) entre o frontend e o banco de dados.",
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "ARCH-002",
    name: "Sem rate limiting em APIs públicas",
    category: "authentication",
    severity: "high",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const publicApis = d.components.filter((c) =>
        ["rest-api", "graphql-api", "api-gateway"].includes(c.type),
      );
      const hasRateLimiter = d.components.some((c) =>
        ["api-gateway", "reverse-proxy", "load-balancer"].includes(c.type),
      );

      if (publicApis.length > 0 && !hasRateLimiter) {
        findings.push({
          id: "ARCH-002-global",
          ruleId: "ARCH-002",
          severity: "high",
          category: "authentication",
          title: "APIs sem rate limiting",
          description: `${publicApis.length} API(s) pública(s) sem API Gateway ou Load Balancer com rate limiting. Vulnerável a ataques de denial-of-service.`,
          affectedComponents: publicApis.map((a) => a.id),
          recommendation:
            "Adicione um API Gateway com rate limiting configurado na frente das APIs públicas.",
        });
      }
      return findings;
    },
  },
  {
    id: "ARCH-003",
    name: "Sem circuit breaker entre microservices",
    category: "availability",
    severity: "medium",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const microservices = d.components.filter((c) =>
        ["microservice", "rest-api", "graphql-api"].includes(c.type),
      );

      if (microservices.length >= 3) {
        // Check if any connections have retry/circuit breaker annotations
        const m2mConns = d.connections.filter(
          (c) =>
            microservices.some((m) => m.id === c.sourceId) &&
            microservices.some((m) => m.id === c.targetId),
        );

        if (m2mConns.length > 0) {
          findings.push({
            id: "ARCH-003-global",
            ruleId: "ARCH-003",
            severity: "medium",
            category: "availability",
            title: "Microservices sem circuit breaker",
            description: `${m2mConns.length} comunicações entre microservices detectadas. Sem circuit breaker, uma falha cascateia para todo o sistema.`,
            affectedComponents: [
              ...new Set(m2mConns.flatMap((c) => [c.sourceId, c.targetId])),
            ],
            recommendation:
              "Implemente circuit breaker pattern (ex: Resilience4j, Polly, Hystrix) nas chamadas entre serviços.",
          });
        }
      }
      return findings;
    },
  },
  {
    id: "ARCH-004",
    name: "Sem autenticação centralizada",
    category: "authentication",
    severity: "high",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const hasAuthService = d.components.some(
        (c) =>
          c.type === "auth-service" || c.label.toLowerCase().includes("auth"),
      );
      const hasApis = d.components.filter((c) =>
        ["rest-api", "graphql-api", "microservice"].includes(c.type),
      );

      if (hasApis.length >= 2 && !hasAuthService) {
        findings.push({
          id: "ARCH-004-global",
          ruleId: "ARCH-004",
          severity: "high",
          category: "authentication",
          title: "Sem serviço de autenticação centralizado",
          description:
            "Múltiplas APIs sem serviço de autenticação centralizado. Cada serviço pode implementar auth de forma inconsistente.",
          affectedComponents: hasApis.map((a) => a.id),
          recommendation:
            "Adicione um Auth Service centralizado (OAuth2/OIDC) ou use o API Gateway para autenticação.",
        });
      }
      return findings;
    },
  },
  {
    id: "ARCH-005",
    name: "Dados sensíveis sem encryption at rest",
    category: "encryption",
    severity: "high",
    check: (d) => {
      const findings: SecurityFinding[] = [];
      const dataStores = d.components.filter((c) =>
        ["database-sql", "database-nosql", "object-storage", "cache"].includes(
          c.type,
        ),
      );

      // Simple heuristic: if label mentions "user", "payment", "auth", etc.
      const sensitiveKeywords = [
        "user",
        "payment",
        "auth",
        "credential",
        "secret",
        "password",
        "token",
      ];
      for (const store of dataStores) {
        const isSensitive = sensitiveKeywords.some((kw) =>
          store.label.toLowerCase().includes(kw),
        );
        if (isSensitive) {
          findings.push({
            id: `ARCH-005-${store.id}`,
            ruleId: "ARCH-005",
            severity: "high",
            category: "encryption",
            title: `${store.label} pode conter dados sensíveis`,
            description: `"${store.label}" parece armazenar dados sensíveis. Recomenda-se encryption at rest e políticas de acesso restrito.`,
            affectedComponents: [store.id],
            recommendation:
              "Habilite encryption at rest (AES-256) e restrinja acesso via IAM roles / network policies.",
          });
        }
      }
      return findings;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_RULES = [...networkRules, ...archRules];

function computeScore(findings: SecurityFinding[]): number {
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case "critical":
        score -= 20;
        break;
      case "high":
        score -= 12;
        break;
      case "medium":
        score -= 5;
        break;
      case "low":
        score -= 2;
        break;
      case "info":
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function analyzeSecurity(diagram: CanvasDiagram): SecurityReport {
  const findings: SecurityFinding[] = [];

  for (const rule of ALL_RULES) {
    try {
      const results = rule.check(diagram);
      findings.push(...results);
    } catch {
      // Skip broken rules
    }
  }

  // Sort by severity
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const score = computeScore(findings);

  return {
    overallScore: score,
    grade: getGrade(score),
    findings,
    summary: {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
    analyzedAt: new Date().toISOString(),
    rulesApplied: ALL_RULES.length,
  };
}
