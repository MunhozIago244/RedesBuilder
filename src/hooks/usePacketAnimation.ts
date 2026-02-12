// ─── usePacketAnimation Hook ────────────────────────────────────────────────
// Hook React para gerenciar animações de pacotes no canvas.
// Escuta eventos do EventBus e mantém estado reativo das animações.

import { useState, useEffect, useCallback, useRef } from "react";
import { simEventBus } from "@/engine/core/eventBus";
import type {
  SimPacket,
  PacketMoveEvent,
  PacketDropEvent,
  PacketArriveEvent,
} from "@/types/simulation";

/** Pacote em animação com posição interpolada */
export interface AnimatedPacket {
  packet: SimPacket;
  /** ID da edge em que está viajando */
  edgeId: string;
  /** Nó de origem do movimento atual */
  fromNodeId: string;
  /** Nó de destino do movimento atual */
  toNodeId: string;
  /** Progresso da animação (0 a 1) */
  progress: number;
  /** Duração total da animação em ms */
  duration: number;
  /** Timestamp de início da animação */
  startedAt: number;
}

/** Pacote descartado com animação de "morte" */
export interface DroppedPacketVisual {
  packet: SimPacket;
  atNodeId: string;
  reason: string;
  explanation: string;
  /** Timestamp do drop (para expiração da animação) */
  droppedAt: number;
}

/** Pacote que chegou com animação de "sucesso" */
export interface ArrivedPacketVisual {
  packet: SimPacket;
  atNodeId: string;
  explanation: string;
  arrivedAt: number;
}

export interface PacketAnimationState {
  /** Pacotes atualmente viajando (para renderizar no canvas) */
  animatingPackets: AnimatedPacket[];
  /** Pacotes que foram descartados recentemente (para animação de drop) */
  recentDrops: DroppedPacketVisual[];
  /** Pacotes que chegaram recentemente (para animação de arrive) */
  recentArrivals: ArrivedPacketVisual[];
  /** Pacote selecionado para inspeção */
  inspectedPacket: SimPacket | null;
  /** Se há animações ativas */
  isAnimating: boolean;
}

/** Tempo que as animações de drop/arrive ficam visíveis (ms) */
const DROP_VISUAL_DURATION = 3000;
const ARRIVE_VISUAL_DURATION = 2000;

/**
 * Hook para gerenciar animações de pacotes no canvas.
 *
 * @example
 * ```tsx
 * function NetworkCanvas() {
 *   const { animatingPackets, recentDrops, inspectedPacket, inspectPacket } = usePacketAnimation();
 *
 *   return (
 *     <>
 *       {animatingPackets.map(ap => (
 *         <PacketEnvelope key={ap.packet.id} animated={ap} onClick={() => inspectPacket(ap.packet)} />
 *       ))}
 *       {recentDrops.map(d => (
 *         <DropAnimation key={d.packet.id} drop={d} />
 *       ))}
 *     </>
 *   );
 * }
 * ```
 */
export function usePacketAnimation(): PacketAnimationState & {
  inspectPacket: (packet: SimPacket | null) => void;
  clearAnimations: () => void;
} {
  const [animatingPackets, setAnimatingPackets] = useState<AnimatedPacket[]>(
    [],
  );
  const [recentDrops, setRecentDrops] = useState<DroppedPacketVisual[]>([]);
  const [recentArrivals, setRecentArrivals] = useState<ArrivedPacketVisual[]>(
    [],
  );
  const [inspectedPacket, setInspectedPacket] = useState<SimPacket | null>(
    null,
  );

  const animFrameRef = useRef<number | null>(null);
  const animatingRef = useRef<AnimatedPacket[]>([]);

  // ─── Animation Loop ───────────────────────────────────────────────
  // Atualiza o progresso de cada pacote animado a cada frame
  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      let hasActive = false;

      const updated = animatingRef.current
        .map((ap) => {
          const elapsed = now - ap.startedAt;
          const progress = Math.min(1, elapsed / ap.duration);
          if (progress < 1) hasActive = true;
          return { ...ap, progress };
        })
        .filter((ap) => ap.progress < 1); // Remover completados

      animatingRef.current = updated;
      setAnimatingPackets([...updated]);

      if (hasActive) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // ─── Event Subscriptions ──────────────────────────────────────────
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Pacote iniciou movimento
    unsubs.push(
      simEventBus.on("packet:move", (event: PacketMoveEvent) => {
        const animated: AnimatedPacket = {
          packet: event.packet,
          edgeId: event.edgeId,
          fromNodeId: event.fromNodeId,
          toNodeId: event.toNodeId,
          progress: 0,
          duration: event.animationDurationMs,
          startedAt: Date.now(),
        };

        animatingRef.current = [
          ...animatingRef.current.filter(
            (a) => a.packet.id !== event.packet.id,
          ),
          animated,
        ];
        setAnimatingPackets([...animatingRef.current]);

        // Garantir que o loop de animação está rodando
        if (animFrameRef.current === null) {
          const updateProgress = () => {
            const now = Date.now();
            animatingRef.current = animatingRef.current
              .map((ap) => ({
                ...ap,
                progress: Math.min(1, (now - ap.startedAt) / ap.duration),
              }))
              .filter((ap) => ap.progress < 1);
            setAnimatingPackets([...animatingRef.current]);
            if (animatingRef.current.length > 0) {
              animFrameRef.current = requestAnimationFrame(updateProgress);
            } else {
              animFrameRef.current = null;
            }
          };
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      }),
    );

    // Pacote descartado
    unsubs.push(
      simEventBus.on("packet:drop", (event: PacketDropEvent) => {
        const visual: DroppedPacketVisual = {
          packet: event.packet,
          atNodeId: event.atNodeId,
          reason: event.reason,
          explanation: event.explanation,
          droppedAt: Date.now(),
        };

        // Remover dos pacotes animando
        animatingRef.current = animatingRef.current.filter(
          (a) => a.packet.id !== event.packet.id,
        );

        setRecentDrops((prev) => [...prev, visual]);

        // Auto-limpar após duração
        setTimeout(() => {
          setRecentDrops((prev) =>
            prev.filter((d) => d.packet.id !== event.packet.id),
          );
        }, DROP_VISUAL_DURATION);
      }),
    );

    // Pacote chegou
    unsubs.push(
      simEventBus.on("packet:arrive", (event: PacketArriveEvent) => {
        const visual: ArrivedPacketVisual = {
          packet: event.packet,
          atNodeId: event.atNodeId,
          explanation: event.explanation,
          arrivedAt: Date.now(),
        };

        // Remover dos animando
        animatingRef.current = animatingRef.current.filter(
          (a) => a.packet.id !== event.packet.id,
        );

        setRecentArrivals((prev) => [...prev, visual]);

        setTimeout(() => {
          setRecentArrivals((prev) =>
            prev.filter((a) => a.packet.id !== event.packet.id),
          );
        }, ARRIVE_VISUAL_DURATION);
      }),
    );

    // Reset da simulação
    unsubs.push(
      simEventBus.on("sim:reset", () => {
        animatingRef.current = [];
        setAnimatingPackets([]);
        setRecentDrops([]);
        setRecentArrivals([]);
        setInspectedPacket(null);
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  const inspectPacket = useCallback((packet: SimPacket | null) => {
    setInspectedPacket(packet);
    if (packet) {
      simEventBus.emit("packet:inspect", { packet });
    }
  }, []);

  const clearAnimations = useCallback(() => {
    animatingRef.current = [];
    setAnimatingPackets([]);
    setRecentDrops([]);
    setRecentArrivals([]);
  }, []);

  return {
    animatingPackets,
    recentDrops,
    recentArrivals,
    inspectedPacket,
    isAnimating: animatingRef.current.length > 0,
    inspectPacket,
    clearAnimations,
  };
}
