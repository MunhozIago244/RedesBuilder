// ─── CostEstimatorPage.tsx ───────────────────────────────────────────────────
// Página de estimativa de custos com comparação multi-cloud e dicas de economia.

import React, { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingDown,
  Cloud,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import type {
  MultiProviderEstimate,
  CostEstimate,
  CloudProvider,
} from "@/types/platform";
import {
  serializeArchDiagram,
  serializeNetworkDiagram,
} from "@/types/platform";
import { estimateCosts } from "@/services/cost/CostEstimator";
import { useArchStore } from "@/store/useArchStore";
import { useNetworkStore } from "@/store/useNetworkStore";

// ═══════════════════════════════════════════════════════════════════════════════

const PROVIDER_LABELS: Record<
  CloudProvider,
  { name: string; color: string; bg: string }
> = {
  aws: {
    name: "AWS",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  azure: {
    name: "Azure",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  gcp: {
    name: "GCP",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ═══════════════════════════════════════════════════════════════════════════════

const ProviderCard: React.FC<{
  estimate: CostEstimate;
  isCheapest: boolean;
}> = ({ estimate, isCheapest }) => {
  const [expanded, setExpanded] = useState(false);
  const config = PROVIDER_LABELS[estimate.provider];

  return (
    <div
      className={`border rounded-xl ${config.bg} transition-all ${
        isCheapest ? "ring-1 ring-green-500/30" : ""
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cloud className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-bold ${config.color}`}>
              {config.name}
            </span>
            {isCheapest && (
              <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold">
                MELHOR PREÇO
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-500">Mensal</p>
            <p className={`text-xl font-bold ${config.color}`}>
              {formatCurrency(estimate.totalMonthly)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Anual</p>
            <p className="text-lg font-semibold text-gray-300">
              {formatCurrency(estimate.totalYearly)}
            </p>
          </div>
        </div>

        {estimate.potentialSavings > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-green-400">
            <TrendingDown className="w-3 h-3" />
            <span className="text-[10px]">
              Economia potencial: {formatCurrency(estimate.potentialSavings)}
              /mês
            </span>
          </div>
        )}
      </div>

      {/* Breakdown toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-white/5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {expanded ? "Ocultar" : "Ver"} detalhamento ({estimate.breakdown.length}{" "}
        itens)
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-white/5">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-600">
                <th className="text-left py-1 font-medium">Componente</th>
                <th className="text-left py-1 font-medium">Tipo</th>
                <th className="text-right py-1 font-medium">Qtd</th>
                <th className="text-right py-1 font-medium">$/mês</th>
              </tr>
            </thead>
            <tbody>
              {estimate.breakdown
                .filter((b) => b.monthlyCost > 0)
                .sort((a, b) => b.monthlyCost - a.monthlyCost)
                .map((item) => (
                  <tr
                    key={item.componentId}
                    className="border-t border-white/[0.02]"
                  >
                    <td className="py-1 text-gray-300">
                      {item.componentLabel}
                    </td>
                    <td className="py-1 text-gray-500">{item.unit}</td>
                    <td className="py-1 text-right text-gray-400">
                      {item.quantity}×
                    </td>
                    <td
                      className={`py-1 text-right font-medium ${config.color}`}
                    >
                      {formatCurrency(item.monthlyCost)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════

const CostEstimatorPage: React.FC = () => {
  const [source, setSource] = useState<"arch" | "network">("arch");

  const archStore = useArchStore();
  const networkStore = useNetworkStore();

  const estimate: MultiProviderEstimate | null = useMemo(() => {
    try {
      if (source === "arch" && archStore.nodes.length > 0) {
        const diagram = serializeArchDiagram(
          archStore.nodes,
          archStore.edges,
          "Architecture",
        );
        return estimateCosts(diagram);
      }
      if (source === "network" && networkStore.nodes.length > 0) {
        const diagram = serializeNetworkDiagram(
          networkStore.nodes,
          networkStore.edges,
          "Network",
        );
        return estimateCosts(diagram);
      }
      return null;
    } catch {
      return null;
    }
  }, [
    source,
    archStore.nodes,
    archStore.edges,
    networkStore.nodes,
    networkStore.edges,
  ]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-bold">Cost Estimator</h1>
        </div>
        <div className="flex bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setSource("arch")}
            className={`px-3 py-1 text-[10px] rounded transition-colors ${
              source === "arch"
                ? "bg-violet-500/20 text-violet-300"
                : "text-gray-500"
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setSource("network")}
            className={`px-3 py-1 text-[10px] rounded transition-colors ${
              source === "network"
                ? "bg-cyan-500/20 text-cyan-300"
                : "text-gray-500"
            }`}
          >
            Network
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!estimate ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                Nenhum diagrama para estimar
              </p>
              <p className="text-xs text-gray-600">
                Crie componentes no{" "}
                <strong>
                  {source === "arch" ? "Architecture" : "Network"} Builder
                </strong>{" "}
                primeiro.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["aws", "azure", "gcp"] as CloudProvider[]).map((provider) => (
                <ProviderCard
                  key={provider}
                  estimate={estimate[provider]}
                  isCheapest={estimate.cheapestProvider === provider}
                />
              ))}
            </div>

            {/* Optimization Tips */}
            {(() => {
              const allTips = [
                ...estimate.aws.optimizationTips,
                ...estimate.azure.optimizationTips,
                ...estimate.gcp.optimizationTips,
              ];
              const uniqueTips = allTips.filter(
                (tip, index, self) =>
                  index === self.findIndex((t) => t.id === tip.id),
              );

              return uniqueTips.length > 0 ? (
                <div>
                  <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Dicas de Otimização
                  </h2>
                  <div className="space-y-2">
                    {uniqueTips.map((tip) => (
                      <div
                        key={tip.id}
                        className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg"
                      >
                        <TrendingDown className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-300">
                            {tip.title}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {tip.description}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-green-400 whitespace-nowrap">
                          -{formatCurrency(tip.estimatedSaving)}/mês
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Footer */}
            <p className="text-[10px] text-gray-700 text-center">
              Preços estimados com base em instâncias on-demand (2024). Valores
              reais podem variar. Gerado em{" "}
              {new Date(estimate.generatedAt).toLocaleString("pt-BR")}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostEstimatorPage;
