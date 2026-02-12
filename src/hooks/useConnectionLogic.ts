// ─── useConnectionLogic Hook ────────────────────────────────────────────────
// Hook que encapsula toda a lógica de validação e criação de conexões.
// Intercepta onConnect do React Flow → abre ConnectionManagerModal.
// Centraliza: validação de mídia, verificação de portas livres, PoE check.

import { useCallback } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import type { NetworkInterface } from "@/types/network";
import { MEDIA_COMPATIBILITY } from "@/types/network";
import { checkPoECompatibility } from "@/data/deviceLibrary";

export interface ConnectionValidation {
  canConnect: boolean;
  mediaCompatible: boolean;
  poeOk: boolean;
  poeWarning?: string;
  sourcePortFree: boolean;
  targetPortFree: boolean;
}

/**
 * Valida se duas interfaces podem ser conectadas.
 */
export function validatePortConnection(
  sourceIface: NetworkInterface,
  targetIface: NetworkInterface,
): ConnectionValidation {
  const mediaCompatible =
    MEDIA_COMPATIBILITY[sourceIface.type]?.includes(targetIface.type) ?? false;

  const sourcePortFree = !sourceIface.connectedEdgeId && sourceIface.adminUp;
  const targetPortFree = !targetIface.connectedEdgeId && targetIface.adminUp;

  const poeCheck = checkPoECompatibility(sourceIface, targetIface);

  return {
    canConnect: mediaCompatible && sourcePortFree && targetPortFree,
    mediaCompatible,
    poeOk: poeCheck.ok,
    poeWarning: poeCheck.warning,
    sourcePortFree,
    targetPortFree,
  };
}

/**
 * Hook principal para lógica de conexão.
 * Retorna helpers para usar no canvas e no modal.
 */
export function useConnectionLogic() {
  const connectPorts = useNetworkStore((s) => s.connectPorts);
  const setShowPortModal = useNetworkStore((s) => s.setShowPortModal);
  const setPendingConnection = useNetworkStore((s) => s.setPendingConnection);

  /**
   * Confirma a conexão entre duas portas selecionadas no modal.
   */
  const confirmConnection = useCallback(
    (
      sourceNodeId: string,
      targetNodeId: string,
      sourceInterfaceId: string,
      targetInterfaceId: string,
    ) => {
      connectPorts(
        sourceNodeId,
        targetNodeId,
        sourceInterfaceId,
        targetInterfaceId,
      );
    },
    [connectPorts],
  );

  /**
   * Cancela o fluxo de conexão e fecha o modal.
   */
  const cancelConnection = useCallback(() => {
    setShowPortModal(false);
    setPendingConnection(null);
  }, [setShowPortModal, setPendingConnection]);

  return {
    confirmConnection,
    cancelConnection,
    validatePortConnection,
  };
}
