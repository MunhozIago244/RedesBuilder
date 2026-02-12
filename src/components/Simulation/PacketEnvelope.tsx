// ─── PacketEnvelope ──────────────────────────────────────────────────────────
// Componente visual que representa um pacote trafegando no canvas.
// Renderizado como overlay posicionado absolutamente no viewport do ReactFlow,
// com posição interpolada entre dois nós a cada animation frame.
//
// Features:
//   - Cor/padrão diferenciado por tipo de pacote (ARP, ICMP, etc.)
//   - Ícone e label acessíveis
//   - Pulso animado durante trânsito
//   - Click para inspecionar (abre PacketInspector)
//   - Suporte a daltonismo via padrões (■, ▤, ⋯)

import React, { useMemo } from "react";
import { useReactFlow } from "reactflow";
import type {
  AnimatedPacket,
  DroppedPacketVisual,
  ArrivedPacketVisual,
} from "@/hooks/usePacketAnimation";
import { PACKET_VISUALS } from "@/types/simulation";
import type { SimPacket } from "@/types/simulation";

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Interpola posição entre dois nós no espaço da viewport */
function interpolatePosition(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number,
): { x: number; y: number } {
  return {
    x: fromX + (toX - fromX) * progress,
    y: fromY + (toY - fromY) * progress,
  };
}

/** Retorna o visual preset do pacote */
function getPacketVisual(packet: SimPacket) {
  // Usa o subType já definido na criação do pacote (PacketFactory)
  return PACKET_VISUALS[packet.subType] ?? PACKET_VISUALS["icmp-echo-request"];
}

/* ── Animated Packet Envelope ─────────────────────────────────────── */

interface PacketEnvelopeProps {
  animated: AnimatedPacket;
  onClick?: (packet: SimPacket) => void;
}

export const PacketEnvelope: React.FC<PacketEnvelopeProps> = ({
  animated,
  onClick,
}) => {
  const { getNode } = useReactFlow();
  const visual = useMemo(
    () => getPacketVisual(animated.packet),
    [animated.packet],
  );

  const fromNode = getNode(animated.fromNodeId);
  const toNode = getNode(animated.toNodeId);

  if (!fromNode || !toNode) return null;

  // Centro dos nós (ReactFlow position é top-left; assumimos ~60x60 nodes)
  const fromX = fromNode.position.x + (fromNode.width ?? 60) / 2;
  const fromY = fromNode.position.y + (fromNode.height ?? 60) / 2;
  const toX = toNode.position.x + (toNode.width ?? 60) / 2;
  const toY = toNode.position.y + (toNode.height ?? 60) / 2;

  const pos = interpolatePosition(fromX, fromY, toX, toY, animated.progress);

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer z-50 group"
      style={{
        transform: `translate(${pos.x - 14}px, ${pos.y - 14}px)`,
        transition: "none",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(animated.packet);
      }}
      role="img"
      aria-label={`Pacote ${visual.label} de ${animated.packet.layer3.srcIp} para ${animated.packet.layer3.dstIp}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.(animated.packet);
        }
      }}
    >
      {/* Glow / Pulse */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-30"
        style={{ backgroundColor: visual.color }}
      />

      {/* Main Circle */}
      <div
        className="relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border-2"
        style={{
          backgroundColor: `${visual.color}20`,
          borderColor: visual.color,
          color: visual.color,
        }}
      >
        <span aria-hidden="true">{visual.icon}</span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
        <div className="bg-slate-900/95 text-[9px] text-gray-300 px-2 py-1 rounded border border-white/10 whitespace-nowrap shadow-xl">
          <span style={{ color: visual.color }}>{visual.label}</span>{" "}
          <span className="text-gray-500">
            {visual.pattern === "striped"
              ? "▤"
              : visual.pattern === "dotted"
                ? "⋯"
                : "■"}
          </span>
          {" | "}
          {animated.packet.layer3.srcIp} → {animated.packet.layer3.dstIp}
        </div>
      </div>
    </div>
  );
};

/* ── Drop Visual (✗ com animação de fade) ─────────────────────────── */

interface DropVisualProps {
  drop: DroppedPacketVisual;
}

export const DropVisual: React.FC<DropVisualProps> = ({ drop }) => {
  const { getNode } = useReactFlow();
  const node = getNode(drop.atNodeId);

  if (!node) return null;

  const x = node.position.x + (node.width ?? 60) / 2;
  const y = node.position.y - 10;

  return (
    <div
      className="absolute pointer-events-none z-40 animate-bounce"
      style={{
        transform: `translate(${x - 40}px, ${y - 30}px)`,
        animation: "fadeOutUp 3s ease-out forwards",
      }}
      role="status"
      aria-label={`Pacote descartado: ${drop.reason}`}
    >
      <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-2 py-1 backdrop-blur-sm">
        <div className="text-red-400 text-[10px] font-bold flex items-center gap-1">
          <span>✗</span>
          <span>DROP</span>
        </div>
        <div className="text-red-300/70 text-[8px] max-w-[120px] truncate">
          {drop.reason}
        </div>
      </div>
    </div>
  );
};

/* ── Arrive Visual (✓ com animação de pulse) ──────────────────────── */

interface ArriveVisualProps {
  arrival: ArrivedPacketVisual;
}

export const ArriveVisual: React.FC<ArriveVisualProps> = ({ arrival }) => {
  const { getNode } = useReactFlow();
  const node = getNode(arrival.atNodeId);

  if (!node) return null;

  const x = node.position.x + (node.width ?? 60) / 2;
  const y = node.position.y - 10;

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{
        transform: `translate(${x - 20}px, ${y - 25}px)`,
        animation: "fadeOutUp 2s ease-out forwards",
      }}
      role="status"
      aria-label={`Pacote chegou: ${arrival.explanation}`}
    >
      <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full px-2 py-1 backdrop-blur-sm">
        <span className="text-emerald-400 text-xs font-bold">✓</span>
      </div>
    </div>
  );
};

/* ── Overlay Container ────────────────────────────────────────────── */
// Este componente encapsula todos os pacotes animados como overlay no canvas.

interface PacketAnimationOverlayProps {
  animatingPackets: AnimatedPacket[];
  recentDrops: DroppedPacketVisual[];
  recentArrivals: ArrivedPacketVisual[];
  onInspectPacket: (packet: SimPacket) => void;
}

export const PacketAnimationOverlay: React.FC<PacketAnimationOverlayProps> = ({
  animatingPackets,
  recentDrops,
  recentArrivals,
  onInspectPacket,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-label="Camada de animação de pacotes"
    >
      {animatingPackets.map((ap) => (
        <PacketEnvelope
          key={ap.packet.id}
          animated={ap}
          onClick={onInspectPacket}
        />
      ))}
      {recentDrops.map((drop) => (
        <DropVisual key={`drop-${drop.packet.id}`} drop={drop} />
      ))}
      {recentArrivals.map((arrival) => (
        <ArriveVisual key={`arrive-${arrival.packet.id}`} arrival={arrival} />
      ))}
    </div>
  );
};

export default PacketAnimationOverlay;
