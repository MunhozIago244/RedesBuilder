// ─── Base Node Component ────────────────────────────────────────────────────
// Componente reutilizável para todos os tipos de dispositivos de rede.
// Segue o Open/Closed Principle — extensível via props, não modificação.
// CAMADA DE REALISMO v2:
//   4 Handles visíveis (Top, Right, Bottom, Left) com visual didático.
//   Hover revela handles com glow cyan + tooltip "Arraste para conectar".
//   O fluxo onConnect intercepta a conexão e abre o ConnectionManagerModal.

import React, { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NetworkDeviceData } from "@/types/network";
import { useNetworkStore } from "@/store/useNetworkStore";

interface BaseNodeProps extends NodeProps<NetworkDeviceData> {
  icon: ReactNode;
  accentColor: string;
  accentBorder: string;
  glowColor: string;
}

const BaseNode: React.FC<BaseNodeProps> = memo(
  ({ id, data, selected, icon, accentColor, accentBorder, glowColor }) => {
    const selectNode = useNetworkStore((s) => s.selectNode);
    const simulationMode = useNetworkStore((s) => s.simulationMode);

    const isPingSource = useNetworkStore((s) => s.ping.source === id);
    const isPingTarget = useNetworkStore((s) => s.ping.target === id);

    const isOnline = data.status === "online";
    const isLinkUp = data.linkStatus === "up";

    const portCount = data.interfaces?.length ?? 0;
    const connectedCount =
      data.interfaces?.filter((i) => i.connectedEdgeId).length ?? 0;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(id);
    };

    return (
      <div
        className={`
        relative group cursor-pointer transition-all duration-200 ease-out
        ${selected ? "scale-110 z-10" : "hover:scale-105"}
      `}
        onClick={handleClick}
        role="button"
        aria-label={`Dispositivo ${data.label} (${data.deviceType}) — ${isOnline ? "Online" : "Offline"}, Link ${isLinkUp ? "Up" : "Down"}`}
        tabIndex={0}
      >
        {/* ── 4 Handles Visíveis (Top, Right, Bottom, Left) ── */}
        {/* Target handles (entrada de conexão) */}
        <Handle
          type="target"
          position={Position.Top}
          id="top-t"
          className="netbuilder-handle netbuilder-handle-top"
          aria-label={`Conectar ao topo de ${data.label}`}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-t"
          className="netbuilder-handle netbuilder-handle-left"
          aria-label={`Conectar à esquerda de ${data.label}`}
        />

        {/* Source handles (saída de conexão) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-s"
          className="netbuilder-handle netbuilder-handle-bottom"
          aria-label={`Conectar da base de ${data.label}`}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right-s"
          className="netbuilder-handle netbuilder-handle-right"
          aria-label={`Conectar da direita de ${data.label}`}
        />

        {/* Connection Hint — "Arraste para conectar" aparece no hover */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
          <span className="text-[8px] text-cyan-400/70 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/20">
            Arraste os pontos ● para conectar
          </span>
        </div>

        {/* Card Principal */}
        <div
          className={`
          relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl
          bg-slate-900/80 backdrop-blur-xl
          border transition-all duration-200
          ${
            selected
              ? `${accentBorder} shadow-lg ${glowColor}`
              : "border-white/10 hover:border-white/20 shadow-md"
          }
          ${isPingSource ? "ring-2 ring-green-400 ring-offset-2 ring-offset-slate-950" : ""}
          ${isPingTarget ? "ring-2 ring-red-400 ring-offset-2 ring-offset-slate-950" : ""}
          ${simulationMode ? "cursor-crosshair" : ""}
        `}
        >
          {/* Ícone */}
          <div className={`${accentColor} transition-colors`}>{icon}</div>

          {/* Label */}
          <span className="text-[11px] font-medium text-gray-200 text-center leading-tight max-w-[100px] truncate">
            {data.label}
          </span>

          {/* Hardware Model Badge */}
          {data.hardwareModel && (
            <span className="text-[8px] font-mono text-gray-500 bg-slate-800/60 px-1.5 py-0.5 rounded leading-none">
              {data.hardwareModel}
            </span>
          )}

          {/* IP Address */}
          {data.ipAddress && (
            <span className="text-[9px] font-mono text-gray-500 leading-none">
              {data.ipAddress}
            </span>
          )}

          {/* Status Indicators + Port Badge */}
          <div
            className="flex items-center gap-1.5"
            aria-label="Indicadores de status"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline
                  ? "bg-green-400 shadow-sm shadow-green-400/50"
                  : "bg-red-400 shadow-sm shadow-red-400/50"
              }`}
              title={isOnline ? "Online" : "Offline"}
              role="img"
              aria-label={isOnline ? "Status: Online" : "Status: Offline"}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isLinkUp
                  ? "bg-cyan-400 shadow-sm shadow-cyan-400/50"
                  : "bg-yellow-400 shadow-sm shadow-yellow-400/50"
              }`}
              title={isLinkUp ? "Link Up" : "Link Down"}
              role="img"
              aria-label={isLinkUp ? "Link: Up" : "Link: Down"}
            />
            {/* Port Summary Badge */}
            {portCount > 0 && (
              <span
                className="text-[8px] font-mono text-gray-600 ml-0.5"
                title={`${connectedCount}/${portCount} portas conectadas`}
              >
                {connectedCount}/{portCount}
              </span>
            )}
          </div>

          {/* Ping Labels */}
          {isPingSource && (
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-green-500/90 text-[9px] font-bold text-white whitespace-nowrap"
              role="status"
            >
              ORIGEM
            </div>
          )}
          {isPingTarget && (
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-red-500/90 text-[9px] font-bold text-white whitespace-nowrap"
              role="status"
            >
              DESTINO
            </div>
          )}
        </div>
      </div>
    );
  },
);

BaseNode.displayName = "BaseNode";

export default BaseNode;
