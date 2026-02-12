// ─── CostEstimator.ts ────────────────────────────────────────────────────────
// Motor de estimativa de custos cloud (AWS / Azure / GCP) por componente.

import type {
  CanvasDiagram,
  CostBreakdownItem,
  CostEstimate,
  MultiProviderEstimate,
  OptimizationTip,
  CloudProvider,
} from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════
// TABELAS DE PREÇO (valores aproximados mensais em USD, 2024)
// ═══════════════════════════════════════════════════════════════════════════════

type PriceEntry = Record<CloudProvider, number> & { unit: string };
type PriceTable = Record<string, PriceEntry>;

const MONTHLY_PRICES: PriceTable = {
  // Compute
  "rest-api": { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  "graphql-api": { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  microservice: { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  monolith: { aws: 48, azure: 55, gcp: 45, unit: "t3.medium / B2" },
  bff: { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  worker: { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  "auth-service": { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
  "websocket-server": { aws: 30, azure: 35, gcp: 28, unit: "t3.small / B1ms" },
  "serverless-fn": {
    aws: 0.5,
    azure: 0.4,
    gcp: 0.5,
    unit: "por 1M invocações",
  },

  // Databases
  "database-sql": { aws: 25, azure: 28, gcp: 22, unit: "db.t3.micro / Basic" },
  "database-nosql": {
    aws: 30,
    azure: 25,
    gcp: 20,
    unit: "DynamoDB / CosmosDB on-demand",
  },
  cache: { aws: 16, azure: 18, gcp: 15, unit: "cache.t3.micro / C0" },
  "search-engine": { aws: 45, azure: 50, gcp: 40, unit: "t3.small / S1" },

  // Messaging
  "message-queue": {
    aws: 4,
    azure: 5,
    gcp: 4,
    unit: "SQS / Service Bus / Pub/Sub",
  },
  "event-bus": {
    aws: 65,
    azure: 70,
    gcp: 55,
    unit: "MSK / Event Hubs / Pub/Sub",
  },
  "pub-sub": { aws: 4, azure: 5, gcp: 4, unit: "SNS / Service Bus" },

  // Networking
  "load-balancer": { aws: 22, azure: 25, gcp: 20, unit: "ALB / App Gateway" },
  "reverse-proxy": { aws: 15, azure: 18, gcp: 14, unit: "EC2 t3.micro" },
  "api-gateway": { aws: 3.5, azure: 4, gcp: 3, unit: "por 1M requests" },
  cdn: { aws: 10, azure: 12, gcp: 10, unit: "CloudFront / CDN" },
  dns: { aws: 0.5, azure: 0.4, gcp: 0.3, unit: "hosted zone" },
  "firewall-waf": {
    aws: 10,
    azure: 12,
    gcp: 10,
    unit: "WAFv2 / App Gateway WAF",
  },

  // Storage
  "object-storage": {
    aws: 2.3,
    azure: 2.1,
    gcp: 2.0,
    unit: "100GB S3 / Blob / GCS",
  },

  // Infra
  "ci-cd": { aws: 0, azure: 0, gcp: 0, unit: "gratuito (básico)" },
  container: { aws: 10, azure: 12, gcp: 10, unit: "ECS Fargate / ACI" },
  orchestrator: { aws: 73, azure: 73, gcp: 73, unit: "EKS / AKS / GKE" },

  // Network devices
  router: { aws: 35, azure: 40, gcp: 32, unit: "VPN Gateway" },
  firewall: { aws: 10, azure: 12, gcp: 10, unit: "Security Group / NSG" },
  "switch-l2": { aws: 0, azure: 0, gcp: 0, unit: "incluído no VPC" },
  "switch-l3": { aws: 0, azure: 0, gcp: 0, unit: "incluído no VPC" },
  server: { aws: 15, azure: 18, gcp: 14, unit: "t3.micro / B1" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

function getOptimizations(
  diagram: CanvasDiagram,
  provider: CloudProvider,
): OptimizationTip[] {
  const tips: OptimizationTip[] = [];

  // Reserved instances
  const computeCount = diagram.components.filter((c) =>
    ["rest-api", "graphql-api", "microservice", "monolith", "server"].includes(
      c.type,
    ),
  ).length;
  if (computeCount >= 3) {
    tips.push({
      id: "opt-reserved",
      title: "Use Reserved Instances",
      description: `Com ${computeCount} instâncias compute, reserved instances (1 ano) economizam ~30% vs on-demand.`,
      estimatedSaving: computeCount * 5,
      category: "compute",
    });
  }

  // Serverless
  const smallApis = diagram.components.filter(
    (c) =>
      ["rest-api", "graphql-api"].includes(c.type) &&
      (!c.replicas || c.replicas <= 1),
  );
  if (smallApis.length > 0) {
    tips.push({
      id: "opt-serverless",
      title: "Considere Serverless",
      description: `${smallApis.length} API(s) single-instance poderiam ser migradas para serverless (Lambda/Functions) com custo quase zero em baixo tráfego.`,
      estimatedSaving: smallApis.length * 12,
      category: "compute",
    });
  }

  // Multi-AZ DB vs single
  const dbs = diagram.components.filter(
    (c) =>
      ["database-sql", "database-nosql"].includes(c.type) &&
      (c.replicas ?? 1) > 1,
  );
  if (dbs.length > 0) {
    tips.push({
      id: "opt-db-single",
      title: "Avalie necessidade de Multi-AZ",
      description:
        "Multi-AZ duplica o custo do banco. Para dev/staging, single-AZ é suficiente.",
      estimatedSaving: dbs.length * 20,
      category: "database",
    });
  }

  // Spot instances for workers
  const workers = diagram.components.filter((c) => c.type === "worker");
  if (workers.length > 0) {
    tips.push({
      id: "opt-spot",
      title: "Use Spot/Preemptible para Workers",
      description: `${workers.length} worker(s) podem rodar em spot instances com até 90% de desconto.`,
      estimatedSaving: workers.length * 12,
      category: "compute",
    });
  }

  return tips;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function estimateForProvider(
  diagram: CanvasDiagram,
  provider: CloudProvider,
): CostEstimate {
  const breakdown: CostBreakdownItem[] = [];
  const providerKey = provider;

  for (const comp of diagram.components) {
    const prices = MONTHLY_PRICES[comp.type];
    if (!prices) continue;

    const replicas = comp.replicas ?? 1;
    const basePrice = prices[providerKey];
    const monthly = basePrice * replicas;

    breakdown.push({
      componentId: comp.id,
      componentLabel: comp.label,
      componentType: comp.type,
      monthlyCost: monthly,
      unit: prices.unit,
      quantity: replicas,
    });
  }

  const totalMonthly = breakdown.reduce((sum, b) => sum + b.monthlyCost, 0);
  const tips = getOptimizations(diagram, provider);
  const totalSavings = tips.reduce((sum, t) => sum + t.estimatedSaving, 0);

  return {
    provider,
    totalMonthly,
    totalYearly: totalMonthly * 12,
    breakdown,
    optimizationTips: tips,
    potentialSavings: totalSavings,
  };
}

export function estimateCosts(diagram: CanvasDiagram): MultiProviderEstimate {
  const aws = estimateForProvider(diagram, "aws");
  const azure = estimateForProvider(diagram, "azure");
  const gcp = estimateForProvider(diagram, "gcp");

  let cheapestProvider: CloudProvider = "aws";
  if (
    gcp.totalMonthly <= aws.totalMonthly &&
    gcp.totalMonthly <= azure.totalMonthly
  ) {
    cheapestProvider = "gcp";
  } else if (azure.totalMonthly < aws.totalMonthly) {
    cheapestProvider = "azure";
  }

  return {
    aws,
    azure,
    gcp,
    cheapestProvider,
    generatedAt: new Date().toISOString(),
  };
}

export function estimateForSingleProvider(
  diagram: CanvasDiagram,
  provider: CloudProvider,
): CostEstimate {
  return estimateForProvider(diagram, provider);
}
