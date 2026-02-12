// ─── usePortManager Hook ────────────────────────────────────────────────────
// Hook para gerenciamento de portas físicas com selectors memoizados.
// PERF: Selectors granulares evitam re-render desnecessário.

import { useMemo } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import type { NetworkInterface } from "@/types/network";
import { MEDIA_COMPATIBILITY } from "@/types/network";

/**
 * Retorna as portas livres de um nó específico.
 * Memoizado — só recalcula quando as interfaces do nó mudam.
 */
export function useAvailablePorts(nodeId: string | null): NetworkInterface[] {
  const node = useNetworkStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  );

  return useMemo(() => {
    if (!node) return [];
    return node.data.interfaces.filter(
      (iface) => !iface.connectedEdgeId && iface.adminUp,
    );
  }, [node]);
}

/**
 * Retorna portas livres do target compatíveis com a mídia de uma interface source.
 */
export function useCompatiblePorts(
  targetNodeId: string | null,
  sourceInterface: NetworkInterface | null,
): NetworkInterface[] {
  const targetNode = useNetworkStore((s) =>
    targetNodeId ? s.nodes.find((n) => n.id === targetNodeId) : undefined,
  );

  return useMemo(() => {
    if (!targetNode || !sourceInterface) return [];

    const compatible = MEDIA_COMPATIBILITY[sourceInterface.type] ?? [];

    return targetNode.data.interfaces.filter(
      (iface) =>
        !iface.connectedEdgeId &&
        iface.adminUp &&
        compatible.includes(iface.type),
    );
  }, [targetNode, sourceInterface]);
}

/**
 * Retorna o resumo de ocupação de portas de um nó.
 */
export function usePortSummary(nodeId: string | null): {
  total: number;
  connected: number;
  available: number;
} {
  const node = useNetworkStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  );

  return useMemo(() => {
    if (!node) return { total: 0, connected: 0, available: 0 };

    const total = node.data.interfaces.length;
    const connected = node.data.interfaces.filter(
      (i) => i.connectedEdgeId,
    ).length;
    return { total, connected, available: total - connected };
  }, [node]);
}
