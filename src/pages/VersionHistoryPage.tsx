// ─── VersionHistoryPage.tsx ──────────────────────────────────────────────────
// Página de histórico de versões com timeline e restore.

import React, { useState, useMemo, useCallback } from "react";
import {
  History,
  Clock,
  Save,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import {
  getVersions,
  deleteVersion,
  clearVersions,
  saveVersion,
  computeDiff,
} from "@/services/versioning/VersioningService";
import type { DiagramVersion } from "@/types/platform";
import {
  serializeArchDiagram,
  serializeNetworkDiagram,
} from "@/types/platform";
import { useArchStore } from "@/store/useArchStore";
import { useNetworkStore } from "@/store/useNetworkStore";

// ═══════════════════════════════════════════════════════════════════════════════

const VersionHistoryPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [source, setSource] = useState<"all" | "network" | "architecture">(
    "all",
  );

  const archStore = useArchStore();
  const networkStore = useNetworkStore();

  const versions = useMemo(() => {
    const all = getVersions();
    if (source === "all") return all;
    return all.filter((v) => v.diagramType === source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, refreshKey]);

  const handleSaveManual = useCallback(() => {
    // Save current arch diagram
    if (archStore.nodes.length > 0) {
      const snapshot = JSON.stringify({
        nodes: archStore.nodes,
        edges: archStore.edges,
      });
      saveVersion("arch-main", "architecture", snapshot, "Salvamento manual");
    }
    // Save current network diagram
    if (networkStore.nodes.length > 0) {
      const snapshot = JSON.stringify({
        nodes: networkStore.nodes,
        edges: networkStore.edges,
      });
      saveVersion("net-main", "network", snapshot, "Salvamento manual");
    }
    setRefreshKey((k) => k + 1);
  }, [archStore, networkStore]);

  const handleRestore = useCallback(
    (version: DiagramVersion) => {
      const confirmed = window.confirm(
        `Restaurar versão "${version.label}"? O diagrama atual será substituído.`,
      );
      if (!confirmed) return;
      try {
        const parsed = JSON.parse(version.snapshot);
        if (version.diagramType === "architecture") {
          archStore.setNodes(parsed.nodes ?? []);
          archStore.setEdges(parsed.edges ?? []);
        } else {
          networkStore.setNodes(parsed.nodes ?? []);
          networkStore.setEdges(parsed.edges ?? []);
        }
        alert("Versão restaurada com sucesso!");
      } catch {
        alert("Erro ao restaurar versão.");
      }
    },
    [archStore, networkStore],
  );

  const handleDelete = useCallback((id: string) => {
    const confirmed = window.confirm(
      "Excluir esta versão? Essa ação não pode ser desfeita.",
    );
    if (!confirmed) return;
    deleteVersion(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm("Tem certeza que deseja limpar todo o histórico?")) {
      clearVersions();
      setRefreshKey((k) => k + 1);
    }
  }, []);

  // Group versions by date
  const grouped = useMemo(() => {
    const map = new Map<string, DiagramVersion[]>();
    for (const v of versions.slice().reverse()) {
      const date = new Date(v.createdAt).toLocaleDateString("pt-BR");
      const list = map.get(date) ?? [];
      list.push(v);
      map.set(date, list);
    }
    return map;
  }, [versions]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold">Histórico de Versões</h1>
          <span className="text-xs text-gray-600">
            ({versions.length} versões)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(["all", "architecture", "network"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-3 py-1 text-[10px] rounded transition-colors ${
                  source === s
                    ? "bg-blue-500/20 text-blue-300"
                    : "text-gray-500"
                }`}
              >
                {s === "all"
                  ? "Todos"
                  : s === "architecture"
                    ? "Arquitetura"
                    : "Rede"}
              </button>
            ))}
          </div>
          <button
            onClick={handleSaveManual}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Save className="w-3 h-3" />
            Salvar Agora
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Limpar
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-6">
        {versions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <GitBranch className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Nenhuma versão salva</p>
              <p className="text-xs text-gray-600">
                Clique em "Salvar Agora" ou habilite auto-save para começar.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {Array.from(grouped.entries()).map(([date, items]) => (
              <div key={date} className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {date}
                </h3>
                <div className="space-y-2 ml-4 border-l border-white/5 pl-4">
                  {items.map((version) => {
                    const isExpanded = expandedId === version.id;
                    return (
                      <div
                        key={version.id}
                        className="bg-slate-900/50 border border-white/5 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : version.id)
                          }
                          aria-expanded={isExpanded}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              version.isAutoSave ? "bg-gray-600" : "bg-blue-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-300">
                                {version.label}
                              </span>
                              <span
                                className={`text-[9px] px-1 rounded ${
                                  version.diagramType === "architecture"
                                    ? "text-violet-400 bg-violet-500/10"
                                    : "text-cyan-400 bg-cyan-500/10"
                                }`}
                              >
                                {version.diagramType === "architecture"
                                  ? "Arch"
                                  : "Net"}
                              </span>
                              {version.isAutoSave && (
                                <span className="text-[9px] text-gray-600">
                                  auto
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-600">
                              {new Date(version.createdAt).toLocaleTimeString(
                                "pt-BR",
                              )}{" "}
                              · {version.componentCount} componentes ·{" "}
                              {version.connectionCount} conexões
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-600" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-white/5 flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleRestore(version)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restaurar
                            </button>
                            <button
                              onClick={() => handleDelete(version.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Excluir
                            </button>
                            <span className="text-[9px] text-gray-700 ml-auto">
                              {version.id}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistoryPage;
