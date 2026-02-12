// ─── Packet Inspector ───────────────────────────────────────────────────────
// Painel de inspeção de pacotes — clicável sobre o "envelope" viajando.
// Mostra cabeçalhos L2/L3 e payload de forma pedagógica.

import React from "react";
import type { SimPacket, ARPPayload, ICMPPayload } from "@/types/simulation";

interface PacketInspectorProps {
  packet: SimPacket;
  onClose: () => void;
}

/**
 * PacketInspector — Mostra detalhes do pacote de forma educacional.
 *
 * Acessibilidade:
 * - role="dialog" com aria-label
 * - Navegável por teclado (Escape para fechar)
 * - Contraste alto para daltonismo (ícones + texto, não só cor)
 */
export const PacketInspector: React.FC<PacketInspectorProps> = ({
  packet,
  onClose,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      role="dialog"
      aria-label={`Inspeção do pacote ${packet.visual.label}`}
      className="absolute z-50 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header — cor do pacote */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: `${packet.visual.color}20`,
          borderBottom: `2px solid ${packet.visual.color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: packet.visual.color }}
            aria-hidden="true"
          />
          {/* Ícone de padrão para daltonismo */}
          <span className="text-xs opacity-60" aria-hidden="true">
            {packet.visual.pattern === "striped"
              ? "▤"
              : packet.visual.pattern === "dotted"
                ? "⋯"
                : "■"}
          </span>
          <span className="text-sm font-semibold text-white">
            {packet.visual.label}
          </span>
          <span className="text-xs text-gray-400">({packet.protocol})</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          aria-label="Fechar inspeção de pacote"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-xs">
        {/* Layer 2 */}
        <section aria-label="Cabeçalho Layer 2 (Ethernet)">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
            <span aria-hidden="true">📦</span> Layer 2 — Ethernet
          </h4>
          <div className="bg-slate-800/50 rounded-lg p-2 space-y-1 font-mono">
            <Row label="Src MAC" value={packet.layer2.srcMac} />
            <Row
              label="Dst MAC"
              value={packet.layer2.dstMac}
              highlight={packet.isBroadcast}
            />
            <Row label="EtherType" value={packet.layer2.etherType} />
          </div>
        </section>

        {/* Layer 3 */}
        <section aria-label="Cabeçalho Layer 3 (IP/ARP)">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
            <span aria-hidden="true">🌐</span> Layer 3 —{" "}
            {packet.protocol === "ARP" ? "ARP" : "IP"}
          </h4>
          <div className="bg-slate-800/50 rounded-lg p-2 space-y-1 font-mono">
            <Row label="Src IP" value={packet.layer3.srcIp} />
            <Row label="Dst IP" value={packet.layer3.dstIp} />
            <Row label="TTL" value={String(packet.layer3.ttl)} />
            <Row label="Protocol" value={packet.layer3.protocol} />
          </div>
        </section>

        {/* Payload */}
        <section aria-label="Payload do pacote">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
            <span aria-hidden="true">📋</span> Payload
          </h4>
          <div className="bg-slate-800/50 rounded-lg p-2 space-y-1 font-mono">
            {packet.protocol === "ARP" && (
              <ARPPayloadView payload={packet.payload as ARPPayload} />
            )}
            {packet.protocol === "ICMP" && (
              <ICMPPayloadView payload={packet.payload as ICMPPayload} />
            )}
          </div>
        </section>

        {/* Metadata */}
        <section aria-label="Metadados do pacote">
          <div className="text-[10px] text-gray-500 flex justify-between pt-2 border-t border-white/5">
            <span>ID: {packet.id}</span>
            <span>Hops: {packet.hopCount}</span>
            <span>{packet.isBroadcast ? "🔊 Broadcast" : "📨 Unicast"}</span>
          </div>
        </section>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const Row: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500">{label}:</span>
    <span className={highlight ? "text-amber-400 font-bold" : "text-gray-200"}>
      {value}
    </span>
  </div>
);

const ARPPayloadView: React.FC<{ payload: ARPPayload }> = ({ payload }) => (
  <>
    <Row label="Operation" value={payload.operation.toUpperCase()} />
    <Row label="Sender MAC" value={payload.senderMac} />
    <Row label="Sender IP" value={payload.senderIp} />
    <Row label="Target MAC" value={payload.targetMac || "??:??:??:??:??:??"} />
    <Row label="Target IP" value={payload.targetIp} />
  </>
);

const ICMPPayloadView: React.FC<{ payload: ICMPPayload }> = ({ payload }) => (
  <>
    <Row label="Type" value={payload.type} />
    <Row label="Code" value={String(payload.code)} />
    <Row label="Sequence" value={String(payload.sequence)} />
    <Row label="Identifier" value={String(payload.identifier)} />
    {payload.data && <Row label="Data" value={payload.data} />}
  </>
);

export default PacketInspector;
