// ─── ArchEdge.tsx ────────────────────────────────────────────────────────────
// Edge customizada para o Architecture Builder.
// Exibe protocolo, direção de dados e badge de métricas.

import React, { memo, useMemo } from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "reactflow";
import type { ArchEdgeData, CommunicationProtocol } from "@/types/arch";
import { useArchStore } from "@/store/useArchStore";

// ── Cores por protocolo ──────────────────────────────────────────────────────

const PROTOCOL_COLORS: Partial<Record<CommunicationProtocol, string>> = {
  HTTP: "#60a5fa",
  HTTPS: "#22d3ee",
  REST: "#34d399",
  GraphQL: "#e879f9",
  gRPC: "#f97316",
  WebSocket: "#2dd4bf",
  AMQP: "#fb923c",
  Kafka: "#22d3ee",
  Redis: "#ef4444",
  SQL: "#60a5fa",
  S3: "#fbbf24",
  DNS: "#818cf8",
  SSE: "#a78bfa",
  TCP: "#94a3b8",
  UDP: "#64748b",
  custom: "#475569",
};

const DIRECTION_ICONS: Record<string, string> = {
  unidirectional: "→",
  bidirectional: "⇄",
  "event-driven": "⚡",
};

const ArchEdge: React.FC<EdgeProps<ArchEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const protocol = data?.protocol ?? "HTTPS";
  const direction = data?.direction ?? "unidirectional";
  const color = PROTOCOL_COLORS[protocol] ?? "#94a3b8";

  return (
    <>
      {/* Hitbox invisível mais larga para facilitar clique */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {/* Linha principal */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? "#fff" : color}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray={direction === "event-driven" ? "6 3" : undefined}
        className="transition-all duration-200"
        style={{
          filter: selected ? `drop-shadow(0 0 6px ${color})` : undefined,
        }}
      />

      {/* Label Badge */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border backdrop-blur-sm transition-all text-[9px] font-medium ${
              selected
                ? "bg-slate-800/95 border-white/20 shadow-lg"
                : "bg-slate-900/80 border-white/5 hover:border-white/15"
            }`}
          >
            {/* Direction icon */}
            <span className="text-[10px] opacity-60">
              {DIRECTION_ICONS[direction] ?? "→"}
            </span>

            {/* Protocol badge */}
            <span
              className="px-1.5 py-0.5 rounded font-mono font-bold text-[8px]"
              style={{
                backgroundColor: `${color}15`,
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {protocol}
            </span>

            {/* Data format */}
            {data?.dataFormat && (
              <span className="text-gray-500 text-[8px]">
                {data.dataFormat}
              </span>
            )}

            {/* Auth indicator */}
            {data?.authenticated && (
              <span className="text-amber-500 text-[8px]" title="Autenticado">
                🔒
              </span>
            )}

            {/* Latency */}
            {data?.latency && (
              <span className="text-gray-600 text-[8px] font-mono">
                {data.latency}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(ArchEdge);
