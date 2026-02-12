// ─── Smart Edge ─────────────────────────────────────────────────────────────
// Edge customizada com validação, debug headers, labels de porta e indicador
// de throughput/adequação da conexão.

import React, { memo, useMemo } from "react";
import { getBezierPath, type EdgeProps } from "reactflow";
import { useNetworkStore } from "@/store/useNetworkStore";
import { VALID_CONNECTIONS, type InterfaceSpeed } from "@/types/network";
import { shallow } from "zustand/shallow";

// ─── Bandwidth Helpers ──────────────────────────────────────────────────────

const SPEED_MBPS: Record<InterfaceSpeed, number> = {
  "10M": 10,
  "100M": 100,
  "1G": 1000,
  "2.5G": 2500,
  "10G": 10000,
};

/** Tráfego estimado por tipo de dispositivo (Mbps) */
const DEVICE_TRAFFIC_ESTIMATE: Record<string, number> = {
  pc: 50,
  laptop: 40,
  server: 500,
  printer: 5,
  "ip-phone": 2,
  "access-point": 300,
  "smart-tv": 25,
  "smart-speaker": 3,
  "smart-light": 0.1,
  "security-camera": 15,
  "robot-vacuum": 2,
  "smart-thermostat": 0.5,
  "game-console": 75,
  "streaming-box": 30,
  router: 0,
  "switch-l2": 0,
  "switch-l3": 0,
  firewall: 0,
  isp: 0,
  cloud: 0,
};

function formatSpeed(mbps: number): string {
  if (mbps >= 1000)
    return `${(mbps / 1000).toFixed(mbps % 1000 === 0 ? 0 : 1)}G`;
  return `${mbps}M`;
}

interface BandwidthInfo {
  linkSpeed: number;
  estimatedTraffic: number;
  utilization: number; // 0-1
  status: "optimal" | "adequate" | "warning" | "critical";
  label: string;
  color: string;
}

function getBandwidthInfo(
  srcSpeed: InterfaceSpeed | undefined,
  tgtSpeed: InterfaceSpeed | undefined,
  srcDeviceType: string,
  tgtDeviceType: string,
): BandwidthInfo | null {
  if (!srcSpeed || !tgtSpeed) return null;

  const linkSpeed = Math.min(
    SPEED_MBPS[srcSpeed] ?? 0,
    SPEED_MBPS[tgtSpeed] ?? 0,
  );
  if (linkSpeed === 0) return null;

  const srcTraffic = DEVICE_TRAFFIC_ESTIMATE[srcDeviceType] ?? 10;
  const tgtTraffic = DEVICE_TRAFFIC_ESTIMATE[tgtDeviceType] ?? 10;
  const estimatedTraffic = Math.max(srcTraffic, tgtTraffic);

  // Dispositivos de infraestrutura não geram tráfego próprio
  if (estimatedTraffic === 0) return null;

  const utilization = estimatedTraffic / linkSpeed;

  let status: BandwidthInfo["status"];
  let color: string;
  if (utilization <= 0.3) {
    status = "optimal";
    color = "#22c55e"; // green
  } else if (utilization <= 0.6) {
    status = "adequate";
    color = "#22d3ee"; // cyan
  } else if (utilization <= 0.85) {
    status = "warning";
    color = "#f59e0b"; // amber
  } else {
    status = "critical";
    color = "#ef4444"; // red
  }

  const label = `${formatSpeed(estimatedTraffic)}/${formatSpeed(linkSpeed)}`;

  return { linkSpeed, estimatedTraffic, utilization, status, label, color };
}

const STATUS_LABELS: Record<string, string> = {
  optimal: "Ótima",
  adequate: "Adequada",
  warning: "Atenção",
  critical: "Gargalo",
};

const SmartEdge: React.FC<EdgeProps> = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    source,
    target,
    data,
    style = {},
    markerEnd,
  }) => {
    const debugMode = useNetworkStore((s) => s.debugMode);

    // PERF: Selecionar apenas os dados dos nós source/target, não o array inteiro.
    // Retorna undefined quando o nó não existe — tipagem segura com optional chaining.
    const sourceNode = useNetworkStore((s) =>
      s.nodes.find((n) => n.id === source),
    );
    const targetNode = useNetworkStore((s) =>
      s.nodes.find((n) => n.id === target),
    );

    // PERF: Selector granular para ping — só re-renderiza quando as edges animadas
    // ou o índice mudam, não em qualquer mudança do objeto ping.
    const { animatingEdges, animatingEdgeIndex } = useNetworkStore(
      (s) => ({
        animatingEdges: s.ping.animatingEdges,
        animatingEdgeIndex: s.ping.animatingEdgeIndex,
      }),
      shallow,
    );

    // Validação da conexão
    const isValid =
      data?.valid ??
      (sourceNode && targetNode
        ? (VALID_CONNECTIONS[sourceNode.data.deviceType]?.includes(
            targetNode.data.deviceType,
          ) ?? false)
        : false);

    // Resolver nomes das portas conectadas para labels nas extremidades
    const portLabels = useMemo(() => {
      if (!data?.sourceInterface || !data?.targetInterface) return null;
      if (!sourceNode || !targetNode) return null;

      const srcIface = sourceNode.data.interfaces?.find(
        (i: { id: string }) => i.id === data.sourceInterface,
      );
      const tgtIface = targetNode.data.interfaces?.find(
        (i: { id: string }) => i.id === data.targetInterface,
      );

      if (!srcIface || !tgtIface) return null;
      return {
        source: srcIface.shortName,
        target: tgtIface.shortName,
      };
    }, [data?.sourceInterface, data?.targetInterface, sourceNode, targetNode]);

    // Calcular info de bandwidth/tráfego da conexão
    const bandwidthInfo = useMemo(() => {
      if (!data?.sourceInterface || !data?.targetInterface) return null;
      if (!sourceNode || !targetNode) return null;

      const srcIface = sourceNode.data.interfaces?.find(
        (i: { id: string }) => i.id === data.sourceInterface,
      );
      const tgtIface = targetNode.data.interfaces?.find(
        (i: { id: string }) => i.id === data.targetInterface,
      );

      if (!srcIface || !tgtIface) return null;

      return getBandwidthInfo(
        srcIface.speed,
        tgtIface.speed,
        sourceNode.data.deviceType,
        targetNode.data.deviceType,
      );
    }, [data?.sourceInterface, data?.targetInterface, sourceNode, targetNode]);

    // Verificar se esta edge está no caminho da animação
    const isAnimatingPath = animatingEdges.includes(id);
    const isCurrentHop = animatingEdges[animatingEdgeIndex] === id;
    const isPastHop =
      isAnimatingPath && animatingEdgeIndex > animatingEdges.indexOf(id);

    // Link status
    const isLinkDown =
      sourceNode?.data.linkStatus === "down" ||
      targetNode?.data.linkStatus === "down";

    // Determinar cor — memoizado para evitar recálculo desnecessário
    const { strokeColor, strokeWidth, strokeDasharray } = useMemo(() => {
      let color = "#475569"; // default slate-600
      let width = 2;
      let dash = "";

      if (isLinkDown) {
        color = "#6b7280"; // gray-500
        dash = "5 5";
        width = 1.5;
      } else if (isCurrentHop) {
        color = "#a855f7"; // purple-500
        width = 3;
      } else if (isPastHop) {
        color = "#22d3ee"; // cyan-400
        width = 2.5;
      } else if (isAnimatingPath) {
        color = "#6366f1"; // indigo-500
        width = 2;
      } else if (!isValid) {
        color = "#ef4444"; // red-500
        width = 2;
        dash = "8 4";
      } else {
        color = "#22d3ee"; // cyan-400
      }

      return { strokeColor: color, strokeWidth: width, strokeDasharray: dash };
    }, [isLinkDown, isCurrentHop, isPastHop, isAnimatingPath, isValid]);

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <>
        {/* Glow effect para edges ativas */}
        {(isCurrentHop || isPastHop) && (
          <path
            d={edgePath}
            fill="none"
            stroke={isCurrentHop ? "#a855f7" : "#22d3ee"}
            strokeWidth={8}
            strokeOpacity={0.15}
            filter="blur(4px)"
          />
        )}

        {/* Hitbox invisível — área de clique ampla para facilitar seleção */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="react-flow__edge-interaction"
          style={{ cursor: "pointer" }}
        />

        {/* Edge principal */}
        <path
          id={id}
          className="react-flow__edge-path transition-colors duration-300"
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
          style={style}
        />

        {/* Packet animation (circulo se movendo) */}
        {isCurrentHop && (
          <circle r="5" fill="#a855f7" filter="drop-shadow(0 0 4px #a855f7)">
            <animateMotion dur="0.6s" repeatCount="1" path={edgePath} />
          </circle>
        )}

        {/* Indicador de conexão inválida */}
        {!isValid && !isLinkDown && (
          <foreignObject
            x={labelX - 10}
            y={labelY - 10}
            width={20}
            height={20}
            className="overflow-visible pointer-events-none"
          >
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/90 text-white text-[10px] font-bold shadow-lg"
              role="img"
              aria-label="Conexão inválida"
            >
              ✗
            </div>
          </foreignObject>
        )}

        {/* Debug Mode — Layer 2/3 Headers */}
        {debugMode && sourceNode && targetNode && (
          <foreignObject
            x={labelX - 100}
            y={labelY - 35}
            width={200}
            height={70}
            className="overflow-visible pointer-events-none"
          >
            <div className="bg-slate-950/95 backdrop-blur-sm text-[9px] font-mono p-2 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/5">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-purple-400 font-bold">L2</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">
                  {sourceNode.data.macAddress.slice(0, 11)}… →{" "}
                  {targetNode.data.macAddress.slice(0, 11)}…
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-cyan-400 font-bold">L3</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">
                  {sourceNode.data.ipAddress || "N/A"} →{" "}
                  {targetNode.data.ipAddress || "N/A"}
                </span>
              </div>
              {!isValid && (
                <div className="text-red-400 mt-1 text-[8px]">
                  ⚠ {data?.reason ?? "Conexão inválida"}
                </div>
              )}
            </div>
          </foreignObject>
        )}

        {/* Port Labels — nomes das interfaces conectadas nos endpoints */}
        {portLabels && !debugMode && (
          <>
            {/* Source port label (próximo ao nó de origem) */}
            <foreignObject
              x={sourceX - 28}
              y={sourceY + 4}
              width={56}
              height={18}
              className="overflow-visible pointer-events-none"
            >
              <div className="text-[8px] font-mono text-cyan-400/80 bg-slate-950/80 px-1 py-0.5 rounded text-center truncate border border-cyan-500/10">
                {portLabels.source}
              </div>
            </foreignObject>
            {/* Target port label (próximo ao nó de destino) */}
            <foreignObject
              x={targetX - 28}
              y={targetY - 20}
              width={56}
              height={18}
              className="overflow-visible pointer-events-none"
            >
              <div className="text-[8px] font-mono text-cyan-400/80 bg-slate-950/80 px-1 py-0.5 rounded text-center truncate border border-cyan-500/10">
                {portLabels.target}
              </div>
            </foreignObject>
          </>
        )}

        {/* Bandwidth / Traffic indicator — badge no centro da edge */}
        {bandwidthInfo && !debugMode && isValid && !isLinkDown && (
          <foreignObject
            x={labelX - 48}
            y={labelY - 12}
            width={96}
            height={24}
            className="overflow-visible pointer-events-none"
          >
            <div
              className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono border backdrop-blur-sm"
              style={{
                background: `${bandwidthInfo.color}15`,
                borderColor: `${bandwidthInfo.color}40`,
                color: bandwidthInfo.color,
              }}
              title={`Tráfego estimado: ${formatSpeed(bandwidthInfo.estimatedTraffic)} | Link: ${formatSpeed(bandwidthInfo.linkSpeed)} | ${Math.round(bandwidthInfo.utilization * 100)}% utilização`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: bandwidthInfo.color }}
              />
              <span>{bandwidthInfo.label}</span>
              <span className="text-[7px] opacity-70">
                {STATUS_LABELS[bandwidthInfo.status]}
              </span>
            </div>
          </foreignObject>
        )}
      </>
    );
  },
);

SmartEdge.displayName = "SmartEdge";
export default SmartEdge;
