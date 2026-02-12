// ─── arch.ts ────────────────────────────────────────────────────────────────
// Tipos e constantes para o Architecture Builder — diagramas de frontend/backend.

// ═══════════════════════════════════════════════════════════════════════════════
//  TIPOS DE COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

/** Cada tipo de componente arquitetural */
export type ArchComponentType =
  // ── Frontend ──
  | "browser"
  | "spa-app" // React / Vue / Angular / Svelte
  | "mobile-app"
  | "cdn"
  | "static-site"
  // ── API Layer ──
  | "api-gateway"
  | "rest-api"
  | "graphql-api"
  | "websocket-server"
  | "bff" // Backend for Frontend
  // ── Backend / Services ──
  | "microservice"
  | "monolith"
  | "serverless-fn" // Lambda, Cloud Functions
  | "worker" // Background worker / cron
  | "auth-service"
  // ── Data ──
  | "database-sql"
  | "database-nosql"
  | "cache" // Redis, Memcached
  | "search-engine" // Elasticsearch
  | "object-storage" // S3, Blob Storage
  // ── Messaging ──
  | "message-queue" // RabbitMQ, SQS
  | "event-bus" // Kafka, EventBridge
  | "pub-sub" // Redis Pub/Sub, Google Pub/Sub
  // ── Infra ──
  | "load-balancer"
  | "reverse-proxy" // Nginx, Traefik
  | "dns"
  | "firewall-waf"
  | "container" // Docker
  | "orchestrator" // Kubernetes
  | "ci-cd"; // Pipeline CI/CD

export type ArchCategory =
  | "frontend"
  | "api-layer"
  | "backend-services"
  | "data-storage"
  | "messaging"
  | "infrastructure";

// ═══════════════════════════════════════════════════════════════════════════════
//  PROTOCOLOS DE COMUNICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export type CommunicationProtocol =
  | "HTTP"
  | "HTTPS"
  | "REST"
  | "GraphQL"
  | "gRPC"
  | "WebSocket"
  | "AMQP" // RabbitMQ
  | "Kafka"
  | "TCP"
  | "UDP"
  | "Redis"
  | "SQL"
  | "S3"
  | "DNS"
  | "SSE" // Server-Sent Events
  | "custom";

export type DataFlowDirection =
  | "unidirectional"
  | "bidirectional"
  | "event-driven";

// ═══════════════════════════════════════════════════════════════════════════════
//  MODELOS DE NÓ / ARESTA
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArchNodeData {
  label: string;
  componentType: ArchComponentType;
  category: ArchCategory;
  technology?: string; // "React 18", "Node.js", "PostgreSQL 16"
  description?: string;
  port?: number; // 3000, 8080, 5432, etc.
  replicas?: number; // para microservices / containers
  env?: "production" | "staging" | "development";
  color: string; // cor do accent
  icon: string; // nome do ícone lucide
  // Métricas estimadas
  estimatedRPS?: number; // requests por segundo
  estimatedLatency?: string; // "~50ms", "<10ms"
}

export interface ArchEdgeData {
  protocol: CommunicationProtocol;
  direction: DataFlowDirection;
  label?: string;
  estimatedRPS?: number;
  latency?: string;
  dataFormat?: string; // "JSON", "Protobuf", "Binary", "HTML"
  authenticated?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TEMPLATES DE COMPONENTES (para sidebar)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArchComponentTemplate {
  type: ArchComponentType;
  label: string;
  category: ArchCategory;
  defaultTech: string;
  icon: string;
  color: string;
  defaultData: Partial<ArchNodeData>;
}

export const ARCH_COMPONENT_TEMPLATES: ArchComponentTemplate[] = [
  // ── Frontend ──────────────────────────────────────────────────────────
  {
    type: "browser",
    label: "Browser / Client",
    category: "frontend",
    defaultTech: "Chrome",
    icon: "Globe",
    color: "#60a5fa",
    defaultData: { estimatedRPS: 100, estimatedLatency: "~200ms" },
  },
  {
    type: "spa-app",
    label: "SPA (React/Vue/Angular)",
    category: "frontend",
    defaultTech: "React 18",
    icon: "AppWindow",
    color: "#22d3ee",
    defaultData: { port: 3000, estimatedRPS: 200 },
  },
  {
    type: "mobile-app",
    label: "App Mobile",
    category: "frontend",
    defaultTech: "React Native",
    icon: "Smartphone",
    color: "#34d399",
    defaultData: { estimatedRPS: 50 },
  },
  {
    type: "cdn",
    label: "CDN",
    category: "frontend",
    defaultTech: "CloudFront",
    icon: "Zap",
    color: "#fbbf24",
    defaultData: { estimatedLatency: "<5ms" },
  },
  {
    type: "static-site",
    label: "Site Estático / SSG",
    category: "frontend",
    defaultTech: "Next.js Static",
    icon: "FileCode2",
    color: "#a78bfa",
    defaultData: { port: 3000 },
  },

  // ── API Layer ─────────────────────────────────────────────────────────
  {
    type: "api-gateway",
    label: "API Gateway",
    category: "api-layer",
    defaultTech: "Kong",
    icon: "Shield",
    color: "#f97316",
    defaultData: { port: 8000, estimatedRPS: 1000, estimatedLatency: "~5ms" },
  },
  {
    type: "rest-api",
    label: "REST API",
    category: "api-layer",
    defaultTech: "Express.js",
    icon: "ArrowLeftRight",
    color: "#22d3ee",
    defaultData: { port: 8080, estimatedRPS: 500, estimatedLatency: "~30ms" },
  },
  {
    type: "graphql-api",
    label: "GraphQL API",
    category: "api-layer",
    defaultTech: "Apollo Server",
    icon: "GitBranch",
    color: "#e879f9",
    defaultData: { port: 4000, estimatedRPS: 300, estimatedLatency: "~40ms" },
  },
  {
    type: "websocket-server",
    label: "WebSocket Server",
    category: "api-layer",
    defaultTech: "Socket.io",
    icon: "Radio",
    color: "#2dd4bf",
    defaultData: { port: 3001, estimatedLatency: "~2ms" },
  },
  {
    type: "bff",
    label: "BFF (Backend for Frontend)",
    category: "api-layer",
    defaultTech: "Next.js API Routes",
    icon: "Layers",
    color: "#818cf8",
    defaultData: { port: 3000, estimatedRPS: 200 },
  },

  // ── Backend / Services ────────────────────────────────────────────────
  {
    type: "microservice",
    label: "Microsserviço",
    category: "backend-services",
    defaultTech: "Node.js",
    icon: "Boxes",
    color: "#a855f7",
    defaultData: {
      port: 3000,
      replicas: 3,
      estimatedRPS: 200,
      estimatedLatency: "~20ms",
    },
  },
  {
    type: "monolith",
    label: "Monolito",
    category: "backend-services",
    defaultTech: "Spring Boot",
    icon: "Box",
    color: "#6366f1",
    defaultData: { port: 8080, estimatedRPS: 500, estimatedLatency: "~50ms" },
  },
  {
    type: "serverless-fn",
    label: "Serverless Function",
    category: "backend-services",
    defaultTech: "AWS Lambda",
    icon: "CloudLightning",
    color: "#fbbf24",
    defaultData: { estimatedLatency: "~100ms (cold start)" },
  },
  {
    type: "worker",
    label: "Background Worker",
    category: "backend-services",
    defaultTech: "Bull / BullMQ",
    icon: "Cog",
    color: "#fb923c",
    defaultData: { estimatedRPS: 50 },
  },
  {
    type: "auth-service",
    label: "Auth Service",
    category: "backend-services",
    defaultTech: "Auth0 / Keycloak",
    icon: "KeyRound",
    color: "#f87171",
    defaultData: { port: 8443, estimatedLatency: "~15ms" },
  },

  // ── Data Storage ──────────────────────────────────────────────────────
  {
    type: "database-sql",
    label: "Banco SQL",
    category: "data-storage",
    defaultTech: "PostgreSQL 16",
    icon: "Database",
    color: "#60a5fa",
    defaultData: { port: 5432, estimatedLatency: "~5ms" },
  },
  {
    type: "database-nosql",
    label: "Banco NoSQL",
    category: "data-storage",
    defaultTech: "MongoDB",
    icon: "HardDrive",
    color: "#34d399",
    defaultData: { port: 27017, estimatedLatency: "~3ms" },
  },
  {
    type: "cache",
    label: "Cache (Redis)",
    category: "data-storage",
    defaultTech: "Redis 7",
    icon: "Zap",
    color: "#ef4444",
    defaultData: { port: 6379, estimatedLatency: "<1ms" },
  },
  {
    type: "search-engine",
    label: "Search Engine",
    category: "data-storage",
    defaultTech: "Elasticsearch",
    icon: "Search",
    color: "#fbbf24",
    defaultData: { port: 9200, estimatedLatency: "~10ms" },
  },
  {
    type: "object-storage",
    label: "Object Storage (S3)",
    category: "data-storage",
    defaultTech: "AWS S3",
    icon: "FolderArchive",
    color: "#fb923c",
    defaultData: { estimatedLatency: "~50ms" },
  },

  // ── Messaging ─────────────────────────────────────────────────────────
  {
    type: "message-queue",
    label: "Message Queue",
    category: "messaging",
    defaultTech: "RabbitMQ",
    icon: "MailPlus",
    color: "#f97316",
    defaultData: { port: 5672, estimatedLatency: "~5ms" },
  },
  {
    type: "event-bus",
    label: "Event Bus / Stream",
    category: "messaging",
    defaultTech: "Apache Kafka",
    icon: "Activity",
    color: "#22d3ee",
    defaultData: { port: 9092, estimatedLatency: "~10ms" },
  },
  {
    type: "pub-sub",
    label: "Pub/Sub",
    category: "messaging",
    defaultTech: "Redis Pub/Sub",
    icon: "Megaphone",
    color: "#a78bfa",
    defaultData: { estimatedLatency: "<1ms" },
  },

  // ── Infrastructure ────────────────────────────────────────────────────
  {
    type: "load-balancer",
    label: "Load Balancer",
    category: "infrastructure",
    defaultTech: "AWS ALB",
    icon: "Scale",
    color: "#22d3ee",
    defaultData: { estimatedLatency: "~1ms" },
  },
  {
    type: "reverse-proxy",
    label: "Reverse Proxy",
    category: "infrastructure",
    defaultTech: "Nginx",
    icon: "ArrowRightLeft",
    color: "#34d399",
    defaultData: { port: 80, estimatedLatency: "~1ms" },
  },
  {
    type: "dns",
    label: "DNS",
    category: "infrastructure",
    defaultTech: "Route 53",
    icon: "Globe",
    color: "#60a5fa",
    defaultData: { estimatedLatency: "~20ms" },
  },
  {
    type: "firewall-waf",
    label: "WAF / Firewall",
    category: "infrastructure",
    defaultTech: "AWS WAF",
    icon: "ShieldAlert",
    color: "#f87171",
    defaultData: { estimatedLatency: "~2ms" },
  },
  {
    type: "container",
    label: "Container (Docker)",
    category: "infrastructure",
    defaultTech: "Docker",
    icon: "Container",
    color: "#38bdf8",
    defaultData: {},
  },
  {
    type: "orchestrator",
    label: "Orchestrator (K8s)",
    category: "infrastructure",
    defaultTech: "Kubernetes",
    icon: "Network",
    color: "#818cf8",
    defaultData: {},
  },
  {
    type: "ci-cd",
    label: "CI/CD Pipeline",
    category: "infrastructure",
    defaultTech: "GitHub Actions",
    icon: "GitPullRequestArrow",
    color: "#a855f7",
    defaultData: {},
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  LABELS E ORDENS
// ═══════════════════════════════════════════════════════════════════════════════

export const ARCH_CATEGORY_LABELS: Record<ArchCategory, string> = {
  frontend: "🖥️ Frontend",
  "api-layer": "🔗 API Layer",
  "backend-services": "⚙️ Backend / Serviços",
  "data-storage": "🗄️ Data Storage",
  messaging: "📨 Messaging",
  infrastructure: "🏗️ Infraestrutura",
};

export const ARCH_CATEGORY_ORDER: ArchCategory[] = [
  "frontend",
  "api-layer",
  "backend-services",
  "data-storage",
  "messaging",
  "infrastructure",
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PROTOCOLOS VÁLIDOS POR TIPO DE COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export const SUGGESTED_PROTOCOLS: Partial<
  Record<ArchComponentType, CommunicationProtocol[]>
> = {
  "rest-api": ["REST", "HTTPS", "HTTP"],
  "graphql-api": ["GraphQL", "HTTPS"],
  "websocket-server": ["WebSocket", "SSE"],
  "database-sql": ["SQL", "TCP"],
  "database-nosql": ["TCP", "HTTP"],
  cache: ["Redis", "TCP"],
  "message-queue": ["AMQP", "TCP"],
  "event-bus": ["Kafka", "TCP"],
  "pub-sub": ["Redis", "TCP"],
  "object-storage": ["S3", "HTTPS"],
  "api-gateway": ["HTTPS", "gRPC"],
  "load-balancer": ["HTTPS", "HTTP", "TCP"],
  dns: ["DNS", "UDP"],
  "serverless-fn": ["HTTPS", "gRPC"],
  "auth-service": ["HTTPS", "gRPC"],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ESTIMATIVAS DE TRÁFEGO (RPS ─ requests por segundo)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_RPS_ESTIMATES: Partial<Record<ArchComponentType, number>> =
  {
    browser: 100,
    "spa-app": 200,
    "mobile-app": 50,
    "api-gateway": 1000,
    "rest-api": 500,
    "graphql-api": 300,
    "websocket-server": 100,
    microservice: 200,
    monolith: 500,
    "serverless-fn": 100,
    worker: 50,
    "database-sql": 1000,
    "database-nosql": 2000,
    cache: 10000,
    "search-engine": 500,
    "message-queue": 500,
    "event-bus": 2000,
  };
