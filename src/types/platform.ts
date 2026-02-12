// ─── platform.ts ─────────────────────────────────────────────────────────────
// Tipos GLOBAIS da plataforma NetBuilder Academy v3.0
// Todos os módulos (CodeGen, Security, Cost, Templates, etc.) usam estes tipos.

import type { Node, Edge } from "reactflow";

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS DIAGRAM — representação serializada universal
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanvasComponent {
  id: string;
  type: string; // DeviceType ou ArchComponentType
  label: string;
  category: string; // DeviceCategory ou ArchCategory
  technology?: string; // "React 18", "PostgreSQL 16"
  port?: number;
  replicas?: number;
  position: { x: number; y: number };
  properties: Record<string, unknown>;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: string;
  targetType: string;
  protocol?: string; // "HTTPS", "gRPC", "TCP", etc.
  direction?: "unidirectional" | "bidirectional" | "event-driven";
  metadata?: Record<string, unknown>;
}

export interface CanvasDiagram {
  id: string;
  name: string;
  type: "NETWORK" | "ARCHITECTURE";
  components: CanvasComponent[];
  connections: CanvasConnection[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    author?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SERIALIZERS — converte React Flow nodes/edges → CanvasDiagram
// ═══════════════════════════════════════════════════════════════════════════════

export function serializeNetworkDiagram(
  nodes: Node[],
  edges: Edge[],
  name = "Untitled Network",
): CanvasDiagram {
  return {
    id: `net-${Date.now()}`,
    name,
    type: "NETWORK",
    components: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "unknown",
      label: n.data?.label ?? n.type ?? "Unknown",
      category: n.data?.category ?? "unknown",
      technology: n.data?.technology,
      port: n.data?.port,
      replicas: n.data?.replicas,
      position: n.position,
      properties: { ...n.data },
    })),
    connections: edges.map((e) => ({
      id: e.id,
      sourceId: e.source,
      targetId: e.target,
      sourceType: nodes.find((n) => n.id === e.source)?.type ?? "",
      targetType: nodes.find((n) => n.id === e.target)?.type ?? "",
      protocol: e.data?.protocol,
      direction: e.data?.direction,
      metadata: { ...e.data },
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "3.0.0",
    },
  };
}

export function serializeArchDiagram(
  nodes: Node[],
  edges: Edge[],
  name = "Untitled Architecture",
): CanvasDiagram {
  return {
    id: `arch-${Date.now()}`,
    name,
    type: "ARCHITECTURE",
    components: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "unknown",
      label: n.data?.label ?? n.type ?? "Unknown",
      category: n.data?.category ?? "unknown",
      technology: n.data?.technology,
      port: n.data?.port,
      replicas: n.data?.replicas,
      position: n.position,
      properties: { ...n.data },
    })),
    connections: edges.map((e) => ({
      id: e.id,
      sourceId: e.source,
      targetId: e.target,
      sourceType: nodes.find((n) => n.id === e.source)?.type ?? "",
      targetType: nodes.find((n) => n.id === e.target)?.type ?? "",
      protocol: e.data?.protocol,
      direction: e.data?.direction,
      metadata: { ...e.data },
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "3.0.0",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECURITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface SecurityFinding {
  id: string;
  ruleId: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  affectedComponents: string[];
  recommendation: string;
}

export interface SecurityReport {
  overallScore: number; // 0-100
  grade: string; // A-F
  findings: SecurityFinding[];
  summary: Record<Severity, number>;
  analyzedAt: string;
  rulesApplied: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CloudProvider = "aws" | "azure" | "gcp";

export interface CostBreakdownItem {
  componentId: string;
  componentName?: string;
  componentLabel: string;
  componentType: string;
  monthlyCost: number;
  unit: string;
  quantity: number;
}

export interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  estimatedSaving: number; // mensal
  category: string;
}

export interface CostEstimate {
  provider: CloudProvider;
  totalMonthly: number;
  totalYearly: number;
  breakdown: CostBreakdownItem[];
  optimizationTips: OptimizationTip[];
  potentialSavings: number;
}

export interface MultiProviderEstimate {
  aws: CostEstimate;
  azure: CostEstimate;
  gcp: CostEstimate;
  cheapestProvider: CloudProvider;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CODE GENERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GeneratorType =
  | "docker-compose"
  | "terraform"
  | "kubernetes"
  | "nginx"
  | "code-skeleton";

export interface GeneratedArtifact {
  type: GeneratorType;
  filename: string;
  content: string;
  language: string; // "yaml", "hcl", "nginx", "typescript"
}

export interface GenerationResult {
  artifacts: GeneratedArtifact[];
  warnings: string[];
  componentsCovered: number;
  totalComponents: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemplateComponent {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

export interface TemplateConnection {
  sourceId: string;
  targetId: string;
  protocol?: string;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string; // emoji or icon key
  tags: string[];
  difficulty: string; // "beginner" | "intermediate" | "advanced"
  estimatedCost: string;
  components: TemplateComponent[];
  connections: TemplateConnection[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VERSIONING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiagramVersion {
  id: string;
  diagramId: string;
  diagramType: "network" | "architecture";
  snapshot: string; // JSON stringified diagram
  label: string;
  createdAt: string;
  isAutoSave: boolean;
  componentCount: number;
  connectionCount: number;
}

export interface DiagramDiff {
  fromVersion: string;
  toVersion: string;
  addedComponents: number;
  removedComponents: number;
  modifiedComponents: number;
  addedConnections: number;
  removedConnections: number;
  summary: string;
}
