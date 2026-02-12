// ─── SecurityPage.tsx ────────────────────────────────────────────────────────
// Página de análise de segurança com score, findings e recommendations.

import React, { useMemo, useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type {
  SecurityReport,
  SecurityFinding,
  Severity,
} from "@/types/platform";
import {
  serializeArchDiagram,
  serializeNetworkDiagram,
} from "@/types/platform";
import { analyzeSecurity } from "@/services/security/SecurityAnalyzer";
import { useArchStore } from "@/store/useArchStore";
import { useNetworkStore } from "@/store/useNetworkStore";

// ═══════════════════════════════════════════════════════════════════════════════

const SEVERITY_CONFIG: Record<
  Severity,
  { icon: React.ElementType; color: string; bg: string }
> = {
  critical: {
    icon: ShieldX,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  high: {
    icon: ShieldAlert,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  low: {
    icon: AlertCircle,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  info: {
    icon: Info,
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
  },
};

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getGradeBg(grade: string): string {
  switch (grade) {
    case "A":
      return "from-green-500/20 to-green-600/5 border-green-500/30";
    case "B":
      return "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30";
    case "C":
      return "from-amber-500/20 to-amber-600/5 border-amber-500/30";
    case "D":
      return "from-orange-500/20 to-orange-600/5 border-orange-500/30";
    default:
      return "from-red-500/20 to-red-600/5 border-red-500/30";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

const FindingCard: React.FC<{ finding: SecurityFinding }> = ({ finding }) => {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg ${config.bg} transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-300">
              {finding.title}
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}
            >
              {finding.severity}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {finding.description}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-gray-600 mt-1" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-600 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/5">
          <p className="text-xs text-gray-400 mb-2">{finding.description}</p>
          {finding.recommendation && (
            <div className="flex items-start gap-2 p-2 bg-white/[0.02] rounded">
              <ShieldCheck className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-cyan-400">
                {finding.recommendation}
              </p>
            </div>
          )}
          <p className="text-[9px] text-gray-600 mt-2">
            Regra: {finding.ruleId} · Categoria: {finding.category} ·{" "}
            {finding.affectedComponents.length} componente(s) afetado(s)
          </p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════

const SecurityPage: React.FC = () => {
  const [source, setSource] = useState<"arch" | "network">("arch");
  const [scanKey, setScanKey] = useState(0);

  const archStore = useArchStore();
  const networkStore = useNetworkStore();

  const report: SecurityReport | null = useMemo(() => {
    try {
      if (source === "arch" && archStore.nodes.length > 0) {
        const diagram = serializeArchDiagram(
          archStore.nodes,
          archStore.edges,
          "Architecture",
        );
        return analyzeSecurity(diagram);
      }
      if (source === "network" && networkStore.nodes.length > 0) {
        const diagram = serializeNetworkDiagram(
          networkStore.nodes,
          networkStore.edges,
          "Network",
        );
        return analyzeSecurity(diagram);
      }
      return null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    source,
    archStore.nodes,
    archStore.edges,
    networkStore.nodes,
    networkStore.edges,
    scanKey,
  ]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold">Security Analyzer</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Source toggle */}
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
          <button
            onClick={() => setScanKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Re-scan
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!report ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                Nenhum diagrama para analisar
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Score Card */}
            <div
              className={`bg-gradient-to-br ${getGradeBg(report.grade)} border rounded-2xl p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Security Score</p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-bold ${getScoreColor(report.overallScore)}`}
                    >
                      {report.overallScore}
                    </span>
                    <span className="text-lg text-gray-500">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-6xl font-black ${getScoreColor(report.overallScore)}`}
                  >
                    {report.grade}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {report.rulesApplied} regras aplicadas
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Badges */}
            <div className="grid grid-cols-5 gap-3">
              {(
                ["critical", "high", "medium", "low", "info"] as Severity[]
              ).map((sev) => {
                const config = SEVERITY_CONFIG[sev];
                const count = report.summary[sev];
                return (
                  <div
                    key={sev}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${config.bg}`}
                  >
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                    <div>
                      <p className={`text-lg font-bold ${config.color}`}>
                        {count}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                        {sev}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Findings */}
            <div>
              <h2 className="text-sm font-bold text-gray-300 mb-3">
                Findings ({report.findings.length})
              </h2>
              <div className="space-y-2">
                {report.findings.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-green-400">
                      Nenhuma vulnerabilidade encontrada! Seu diagrama está
                      seguro.
                    </p>
                  </div>
                ) : (
                  report.findings.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-gray-700 text-center">
              Analisado em {new Date(report.analyzedAt).toLocaleString("pt-BR")}{" "}
              · {report.rulesApplied} regras
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPage;
