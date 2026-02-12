// ─── Connection Manager Modal ───────────────────────────────────────────────
// Modal estilo "Connection Wizard" para seleção de portas ao conectar nós.
// Features:
//   - Duas colunas: Source (Origem) e Target (Destino)
//   - Filtragem de compatibilidade de mídia (RJ45↔RJ45, SFP↔SFP)
//   - Alerta de PoE (interface requer PoE mas porta não fornece)
//   - Preview da conexão no footer antes de confirmar
//   - Usa useConnectionLogic para validação centralizada

import React, { memo, useMemo, useState } from "react";
import {
  X,
  Cable,
  Wifi,
  Radio,
  Check,
  AlertTriangle,
  Zap,
  ZapOff,
  Link2,
} from "lucide-react";
import { useNetworkStore } from "@/store/useNetworkStore";
import type { NetworkInterface, InterfaceType, PoEType } from "@/types/network";
import { MEDIA_COMPATIBILITY } from "@/types/network";
import {
  useConnectionLogic,
  validatePortConnection,
} from "@/hooks/useConnectionLogic";

// ─── Helpers ────────────────────────────────────────────────────────────────

const MEDIA_ICONS: Record<InterfaceType, React.ReactNode> = {
  rj45: <Cable size={12} />,
  sfp: <Radio size={12} />,
  wifi: <Wifi size={12} />,
};

const MEDIA_LABELS: Record<InterfaceType, string> = {
  rj45: "Cobre (RJ45)",
  sfp: "Fibra (SFP)",
  wifi: "Wireless",
};

const POE_ICONS: Record<PoEType, React.ReactNode> = {
  in: <Zap size={10} className="text-yellow-400" />,
  out: <Zap size={10} className="text-green-400" />,
  none: <ZapOff size={10} className="text-gray-600" />,
};

const POE_LABELS: Record<PoEType, string> = {
  in: "PoE In (Consome)",
  out: "PoE Out (Fornece)",
  none: "Sem PoE",
};

// ─── Interface Card ─────────────────────────────────────────────────────────

interface InterfaceCardProps {
  iface: NetworkInterface;
  selected: boolean;
  disabled: boolean;
  incompatible: boolean;
  onClick: () => void;
}

const InterfaceCard: React.FC<InterfaceCardProps> = memo(
  ({ iface, selected, disabled, incompatible, onClick }) => {
    const occupied = !!iface.connectedEdgeId;
    const isDown = !iface.adminUp;
    const isDisabled = disabled || occupied || isDown;

    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        aria-label={`Interface ${iface.shortName} (${MEDIA_LABELS[iface.type]}) — ${occupied ? "Ocupada" : isDown ? "Desabilitada" : incompatible ? "Mídia incompatível" : "Disponível"}`}
        aria-pressed={selected}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left
          transition-all duration-150 text-sm
          ${
            selected
              ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/30"
              : incompatible && !isDisabled
                ? "bg-orange-500/5 border-orange-500/20 text-gray-500 cursor-not-allowed opacity-60"
                : isDisabled
                  ? "bg-slate-800/30 border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                  : "bg-slate-800/50 border-white/5 text-gray-300 hover:bg-slate-700/50 hover:border-white/10 cursor-pointer"
          }
        `}
      >
        {/* Media Icon */}
        <span className={selected ? "text-cyan-400" : "text-gray-500"}>
          {MEDIA_ICONS[iface.type]}
        </span>

        {/* Name + Details */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs truncate flex items-center gap-1.5">
            {iface.shortName}
            {iface.roleLabel && (
              <span className="text-[8px] text-gray-500 font-sans">
                ({iface.roleLabel})
              </span>
            )}
          </div>
          <div className="text-[9px] text-gray-500 truncate flex items-center gap-1">
            {iface.speed} {MEDIA_LABELS[iface.type]}
            <span className="inline-flex items-center gap-0.5">
              {POE_ICONS[iface.poe]}
            </span>
            {iface.lacpGroup && (
              <span className="text-purple-400 font-mono">
                LACP:{iface.lacpGroup}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {occupied && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-medium">
            Ocupada
          </span>
        )}
        {isDown && !occupied && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
            Shut
          </span>
        )}
        {incompatible && !isDisabled && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
            Incomp.
          </span>
        )}
        {selected && (
          <Check size={14} className="text-cyan-400 flex-shrink-0" />
        )}
      </button>
    );
  },
);

InterfaceCard.displayName = "InterfaceCard";

// ─── Main Modal ─────────────────────────────────────────────────────────────

const ConnectionManagerModal: React.FC = () => {
  const pendingConnection = useNetworkStore((s) => s.pendingConnection);
  const showPortModal = useNetworkStore((s) => s.showPortModal);
  const nodes = useNetworkStore((s) => s.nodes);

  const { confirmConnection, cancelConnection } = useConnectionLogic();

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const sourceNode = useMemo(
    () => nodes.find((n) => n.id === pendingConnection?.sourceNodeId),
    [nodes, pendingConnection?.sourceNodeId],
  );
  const targetNode = useMemo(
    () => nodes.find((n) => n.id === pendingConnection?.targetNodeId),
    [nodes, pendingConnection?.targetNodeId],
  );

  const sourceIface = useMemo(
    () =>
      sourceNode?.data.interfaces.find((i) => i.id === selectedSource) ?? null,
    [sourceNode, selectedSource],
  );

  const targetIface = useMemo(
    () =>
      targetNode?.data.interfaces.find((i) => i.id === selectedTarget) ?? null,
    [targetNode, selectedTarget],
  );

  // Portas target compatíveis com a interface source selecionada
  const targetCompatibleIds = useMemo(() => {
    if (!sourceIface || !targetNode) return new Set<string>();
    const compatible = MEDIA_COMPATIBILITY[sourceIface.type] ?? [];
    return new Set(
      targetNode.data.interfaces
        .filter(
          (i) => !i.connectedEdgeId && i.adminUp && compatible.includes(i.type),
        )
        .map((i) => i.id),
    );
  }, [sourceIface, targetNode]);

  // Validação completa da conexão selecionada
  const validation = useMemo(() => {
    if (!sourceIface || !targetIface) return null;
    return validatePortConnection(sourceIface, targetIface);
  }, [sourceIface, targetIface]);

  if (!showPortModal || !pendingConnection || !sourceNode || !targetNode) {
    return null;
  }

  const canConnect = validation?.canConnect ?? false;

  const handleConnect = () => {
    if (!selectedSource || !selectedTarget || !canConnect) return;
    confirmConnection(
      pendingConnection.sourceNodeId,
      pendingConnection.targetNodeId,
      selectedSource,
      selectedTarget,
    );
    setSelectedSource(null);
    setSelectedTarget(null);
  };

  const handleCancel = () => {
    cancelConnection();
    setSelectedSource(null);
    setSelectedTarget(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Connection Manager — Selecionar portas"
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-[680px] max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Link2 size={16} className="text-cyan-400" />
              Connection Manager
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Selecione as interfaces físicas para a conexão
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Cancelar conexão"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — Two Columns */}
        <div className="flex divide-x divide-white/5 max-h-[55vh]">
          {/* Source Column */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Origem — {sourceNode.data.label}
            </h3>
            <div
              className="space-y-1.5"
              role="listbox"
              aria-label="Interfaces de origem"
            >
              {sourceNode.data.interfaces.map((iface) => (
                <InterfaceCard
                  key={iface.id}
                  iface={iface}
                  selected={selectedSource === iface.id}
                  disabled={false}
                  incompatible={false}
                  onClick={() => {
                    setSelectedSource(iface.id);
                    // Resetar target se incompatível com novo source
                    if (selectedTarget) {
                      const compatible = MEDIA_COMPATIBILITY[iface.type] ?? [];
                      const tIface = targetNode.data.interfaces.find(
                        (i) => i.id === selectedTarget,
                      );
                      if (tIface && !compatible.includes(tIface.type)) {
                        setSelectedTarget(null);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Target Column */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Destino — {targetNode.data.label}
            </h3>
            <div
              className="space-y-1.5"
              role="listbox"
              aria-label="Interfaces de destino"
            >
              {targetNode.data.interfaces.map((iface) => {
                const isIncompat =
                  sourceIface !== null &&
                  !targetCompatibleIds.has(iface.id) &&
                  !iface.connectedEdgeId &&
                  iface.adminUp;

                return (
                  <InterfaceCard
                    key={iface.id}
                    iface={iface}
                    selected={selectedTarget === iface.id}
                    disabled={
                      sourceIface ? !targetCompatibleIds.has(iface.id) : false
                    }
                    incompatible={isIncompat}
                    onClick={() => setSelectedTarget(iface.id)}
                  />
                );
              })}
            </div>

            {/* No compatible ports warning */}
            {sourceIface && targetCompatibleIds.size === 0 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-400">
                <AlertTriangle size={14} />
                Nenhuma porta do destino é compatível com{" "}
                {MEDIA_LABELS[sourceIface.type]}
              </div>
            )}
          </div>
        </div>

        {/* PoE Warning Banner */}
        {validation && !validation.poeOk && validation.poeWarning && (
          <div className="mx-5 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-400">
            <Zap size={14} />
            <span>
              <strong>Alerta PoE:</strong> {validation.poeWarning}
            </span>
          </div>
        )}

        {/* Footer — Preview + Actions */}
        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
          <div className="text-[10px] text-gray-500 font-mono">
            {selectedSource && sourceIface ? (
              <span className="flex items-center gap-1">
                {sourceIface.shortName}
                <span className="text-gray-600">({sourceIface.speed})</span>
                <span className="text-cyan-500 mx-1">{"<--->"}</span>
                {selectedTarget && targetIface ? (
                  <>
                    {targetIface.shortName}
                    <span className="text-gray-600">({targetIface.speed})</span>
                  </>
                ) : (
                  <span className="text-gray-600">...</span>
                )}
              </span>
            ) : (
              "Selecione uma porta de origem"
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 bg-slate-800/60 border border-white/5 hover:border-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConnect}
              disabled={!canConnect}
              className={`
                px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                ${
                  canConnect
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
                    : "bg-slate-800/30 text-gray-600 border border-white/5 cursor-not-allowed"
                }
              `}
              aria-label="Confirmar conexão"
            >
              <Cable size={12} />
              Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionManagerModal;
