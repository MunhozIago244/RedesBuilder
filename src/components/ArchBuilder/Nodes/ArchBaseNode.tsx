// ─── ArchBaseNode.tsx ────────────────────────────────────────────────────────
// Nó genérico para o Architecture Builder.
// Todos os tipos de componente arquitetural renderizam através deste componente.
// 4 handles visíveis (topo, direita, baixo, esquerda) — iguais ao BaseNode de rede.

import React, { memo, useMemo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import * as LucideIcons from "lucide-react";
import type { ArchNodeData } from "@/types/arch";
import { useArchStore } from "@/store/useArchStore";

/** Resolve ícone lucide pelo nome (string) */
function resolveIcon(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? LucideIcons.Box;
}

const ArchBaseNode: React.FC<NodeProps<ArchNodeData>> = ({
  id,
  data,
  selected,
}) => {
  const selectNode = useArchStore((s) => s.selectNode);
  const Icon = useMemo(() => resolveIcon(data.icon), [data.icon]);

  const borderColor = selected ? data.color : "rgba(255,255,255,0.06)";

  return (
    <div
      className="arch-node group relative"
      onClick={() => selectNode(id)}
      style={{ "--node-color": data.color } as React.CSSProperties}
    >
      {/* ── Handles ──────────────────────────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-t"
        className="archbuilder-handle archbuilder-handle-top"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-t"
        className="archbuilder-handle archbuilder-handle-left"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-s"
        className="archbuilder-handle archbuilder-handle-bottom"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-s"
        className="archbuilder-handle archbuilder-handle-right"
      />

      {/* ── Card Body ────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2.5 rounded-xl border transition-all duration-200 min-w-[140px] max-w-[200px]"
        style={{
          borderColor,
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          boxShadow: selected
            ? `0 0 20px ${data.color}25, 0 4px 12px rgba(0,0,0,0.4)`
            : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* Top row: icon + label */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${data.color}20`,
              border: `1px solid ${data.color}30`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color: data.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-200 truncate leading-tight">
              {data.label}
            </p>
            {data.technology && (
              <p className="text-[9px] text-gray-500 truncate leading-tight">
                {data.technology}
              </p>
            )}
          </div>
        </div>

        {/* Bottom row: metadata chips */}
        <div className="flex flex-wrap gap-1">
          {data.port && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono">
              :{data.port}
            </span>
          )}
          {data.replicas && data.replicas > 1 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
              ×{data.replicas}
            </span>
          )}
          {data.estimatedLatency && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
              {data.estimatedLatency}
            </span>
          )}
          {data.estimatedRPS && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500/70">
              {data.estimatedRPS} rps
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ArchBaseNode);
