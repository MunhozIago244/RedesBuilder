// ─── ArchInspector.tsx ───────────────────────────────────────────────────────
// Painel lateral direito do Architecture Builder — edição de propriedades do nó.

import React, { useMemo } from "react";
import { X, Info } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useArchStore } from "@/store/useArchStore";
import { ARCH_CATEGORY_LABELS } from "@/types/arch";
import type { ArchNodeData } from "@/types/arch";

function resolveIcon(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? LucideIcons.Box;
}

const ArchInspector: React.FC = () => {
  const nodes = useArchStore((s) => s.nodes);
  const edges = useArchStore((s) => s.edges);
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);
  const selectNode = useArchStore((s) => s.selectNode);
  const updateNodeData = useArchStore((s) => s.updateNodeData);
  const removeNode = useArchStore((s) => s.removeNode);

  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  if (!node) return null;

  const data = node.data;
  const Icon = resolveIcon(data.icon);

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id,
  );

  const handleChange = (
    field: keyof ArchNodeData,
    value: string | number | boolean,
  ) => {
    updateNodeData(node.id, { [field]: value });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/5 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${data.color}20`,
            border: `1px solid ${data.color}30`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: data.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate">
            {data.label}
          </p>
          <p className="text-[9px] text-gray-500">
            {ARCH_CATEGORY_LABELS[data.category]}
          </p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          title="Fechar inspector"
          aria-label="Fechar inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {/* Label */}
        <Field label="Nome">
          <input
            value={data.label}
            onChange={(e) => handleChange("label", e.target.value)}
            className="inspector-input"
            placeholder="Nome do componente"
          />
        </Field>

        {/* Technology */}
        <Field label="Tecnologia">
          <input
            value={data.technology ?? ""}
            onChange={(e) => handleChange("technology", e.target.value)}
            className="inspector-input"
            placeholder="e.g. React 18, PostgreSQL"
          />
        </Field>

        {/* Port */}
        <Field label="Porta">
          <input
            type="number"
            value={data.port ?? ""}
            onChange={(e) =>
              handleChange("port", parseInt(e.target.value) || 0)
            }
            className="inspector-input font-mono"
            placeholder="8080"
          />
        </Field>

        {/* Replicas */}
        <Field label="Réplicas">
          <input
            type="number"
            min={1}
            value={data.replicas ?? 1}
            onChange={(e) =>
              handleChange("replicas", parseInt(e.target.value) || 1)
            }
            className="inspector-input font-mono"
            placeholder="1"
          />
        </Field>

        {/* Estimated RPS */}
        <Field label="RPS estimado">
          <input
            type="number"
            value={data.estimatedRPS ?? ""}
            onChange={(e) =>
              handleChange("estimatedRPS", parseInt(e.target.value) || 0)
            }
            className="inspector-input font-mono"
            placeholder="500"
          />
        </Field>

        {/* Latency */}
        <Field label="Latência estimada">
          <input
            value={data.estimatedLatency ?? ""}
            onChange={(e) => handleChange("estimatedLatency", e.target.value)}
            className="inspector-input font-mono"
            placeholder="~50ms"
          />
        </Field>

        {/* Description */}
        <Field label="Descrição">
          <textarea
            value={data.description ?? ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            className="inspector-input resize-none"
            placeholder="Observações sobre este componente..."
          />
        </Field>

        {/* Connections */}
        {connectedEdges.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Conexões ({connectedEdges.length})
            </p>
            <div className="space-y-1">
              {connectedEdges.map((edge) => {
                const isSource = edge.source === node.id;
                const otherNode = nodes.find(
                  (n) => n.id === (isSource ? edge.target : edge.source),
                );
                return (
                  <div
                    key={edge.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/5 text-[9px]"
                  >
                    <span className="text-gray-600">
                      {isSource ? "→" : "←"}
                    </span>
                    <span className="text-gray-300 truncate flex-1">
                      {otherNode?.data.label ?? "???"}
                    </span>
                    <span
                      className="px-1 py-0.5 rounded font-mono text-[8px]"
                      style={{
                        backgroundColor: `${otherNode?.data.color ?? "#666"}15`,
                        color: otherNode?.data.color ?? "#666",
                      }}
                    >
                      {edge.data?.protocol ?? "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-gray-600 font-mono">
          ID: {node.id.slice(-8)}
        </span>
        <button
          onClick={() => {
            removeNode(node.id);
            selectNode(null);
          }}
          className="text-[9px] text-red-500/60 hover:text-red-400 transition-colors"
        >
          Remover componente
        </button>
      </div>
    </div>
  );
};

/** Campo reutilizável */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
      {label}
    </label>
    {children}
  </div>
);

export default ArchInspector;
