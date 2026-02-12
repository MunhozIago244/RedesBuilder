// ─── Debug Panel ────────────────────────────────────────────────────────────
// Painel flutuante exibindo informações de debug do pacote e camadas.
// AUDITORIA:
//   Estágio 2 — Selectores computados para contadores (nodeCount, edgeCount,
//               invalidCount), evitando re-render a cada drag de nó.
//   Estágio 4 — aria-labels e role="region" no painel.

import React, { memo, useMemo } from "react";
import { Bug, Layers, ArrowRight } from "lucide-react";
import { useNetworkStore } from "@/store/useNetworkStore";

const DebugPanel: React.FC = () => {
  const debugMode = useNetworkStore((s) => s.debugMode);
  const pingResult = useNetworkStore((s) => s.ping.result);

  // PERF: Selectores computados — só recalcular quando length/conteúdo muda.
  const nodeCount = useNetworkStore((s) => s.nodes.length);
  const edgeCount = useNetworkStore((s) => s.edges.length);
  const invalidCount = useNetworkStore(
    (s) => s.edges.filter((e) => e.data?.valid === false).length,
  );

  if (!debugMode) return null;

  const hasPackets = pingResult && pingResult.packets.length > 0;

  return (
    <div
      className="absolute bottom-4 left-4 z-50 w-96 max-h-[300px] overflow-y-auto animate-fade-in custom-scrollbar"
      role="region"
      aria-label="Painel de Debug — Packet Inspector"
    >
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Bug size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-gray-200">
            Debug — Packet Inspector
          </span>
          <span className="text-[9px] text-gray-600 ml-auto">
            L2/L3 Headers
          </span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Network Stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Nós" value={nodeCount} color="text-cyan-400" />
            <StatBox
              label="Conexões"
              value={edgeCount}
              color="text-purple-400"
            />
            <StatBox
              label="Inválidas"
              value={invalidCount}
              color="text-red-400"
            />
          </div>

          {/* Packet Headers */}
          {hasPackets ? (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Layers size={10} />
                Pacotes no caminho ({pingResult.packets.length} hops)
              </h4>
              {pingResult.packets.map((pkt, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-slate-800/50 border border-white/5 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span className="font-bold text-gray-300">Hop {i + 1}</span>
                    <ArrowRight size={8} />
                  </div>
                  {/* Layer 2 */}
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-bold text-purple-400 w-6 flex-shrink-0">
                      L2
                    </span>
                    <div className="text-[9px] font-mono text-gray-400 space-y-0.5">
                      <div>
                        Src MAC:{" "}
                        <span className="text-gray-300">
                          {pkt.layer2.srcMac}
                        </span>
                      </div>
                      <div>
                        Dst MAC:{" "}
                        <span className="text-gray-300">
                          {pkt.layer2.dstMac}
                        </span>
                      </div>
                      <div>
                        EtherType:{" "}
                        <span className="text-gray-300">
                          {pkt.layer2.etherType}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Layer 3 */}
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-bold text-cyan-400 w-6 flex-shrink-0">
                      L3
                    </span>
                    <div className="text-[9px] font-mono text-gray-400 space-y-0.5">
                      <div>
                        Src IP:{" "}
                        <span className="text-gray-300">
                          {pkt.layer3.srcIp}
                        </span>
                      </div>
                      <div>
                        Dst IP:{" "}
                        <span className="text-gray-300">
                          {pkt.layer3.dstIp}
                        </span>
                      </div>
                      <div>
                        TTL:{" "}
                        <span className="text-gray-300">{pkt.layer3.ttl}</span>{" "}
                        | Protocol:{" "}
                        <span className="text-gray-300">
                          {pkt.layer3.protocol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600 text-xs">
              <Bug size={24} className="mx-auto mb-2 opacity-30" />
              Execute um Ping para visualizar headers de pacotes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Stat Box ───────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

const StatBox: React.FC<StatBoxProps> = memo(({ label, value, color }) => (
  <div className="flex flex-col items-center p-2 rounded-lg bg-slate-800/40 border border-white/5">
    <span className={`text-lg font-bold ${color}`}>{value}</span>
    <span className="text-[9px] text-gray-500">{label}</span>
  </div>
));

StatBox.displayName = "StatBox";

export default DebugPanel;
