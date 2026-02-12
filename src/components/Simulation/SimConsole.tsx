// ─── Simulation Console ─────────────────────────────────────────────────────
// Console pedagógico — mostra logs em tempo real da simulação.
// Estilo terminal com cores diferenciadas por nível de log.
// Acessível: navegável por teclado, role="log".

import React, { useEffect, useRef, useState } from "react";
import type { ConsoleLogEvent, SimulationSpeed } from "@/types/simulation";
import { useSimulationEngine } from "@/hooks/useSimulationEngine";

interface SimConsoleProps {
  /** Se o console está visível */
  isOpen: boolean;
  /** Callback para fechar */
  onClose: () => void;
}

const LEVEL_STYLES: Record<
  ConsoleLogEvent["level"],
  { color: string; icon: string; bg: string }
> = {
  info: { color: "text-blue-400", icon: "ℹ", bg: "bg-blue-500/5" },
  warn: { color: "text-amber-400", icon: "⚠", bg: "bg-amber-500/5" },
  error: { color: "text-red-400", icon: "✗", bg: "bg-red-500/5" },
  success: { color: "text-emerald-400", icon: "✓", bg: "bg-emerald-500/5" },
};

const SPEED_LABELS: Record<SimulationSpeed, string> = {
  slow: "🐢 Lento",
  normal: "▶ Normal",
  fast: "⏩ Rápido",
  instant: "⚡ Instantâneo",
};

/**
 * SimConsole — Console de logs da simulação estilo terminal.
 *
 * Recursos:
 * - Auto-scroll para o final
 * - Expansão de detalhes (click)
 * - Filtragem por nível
 * - Controles de velocidade da simulação
 */
export const SimConsole: React.FC<SimConsoleProps> = ({ isOpen, onClose }) => {
  const { logs, state, setSpeed, reset, lastSummary } = useSimulationEngine();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filterLevel, setFilterLevel] = useState<
    ConsoleLogEvent["level"] | "all"
  >("all");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const filteredLogs =
    filterLevel === "all" ? logs : logs.filter((l) => l.level === filterLevel);

  return (
    <div
      className="fixed bottom-0 left-64 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 flex flex-col"
      style={{ height: "280px" }}
      role="region"
      aria-label="Console de simulação de rede"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Console de Simulação
          </h3>

          {/* Speed Controls */}
          <div
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Velocidade da simulação"
          >
            {(Object.entries(SPEED_LABELS) as [SimulationSpeed, string][]).map(
              ([speed, label]) => (
                <button
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`px-2 py-0.5 text-[10px] rounded-md transition-all ${
                    state.speed === speed
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                  role="radio"
                  aria-checked={state.speed === speed}
                  aria-label={`Velocidade: ${label}`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-[10px]">
            {state.isRunning && (
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Simulando...
              </span>
            )}
            {lastSummary && (
              <span
                className={
                  lastSummary.success ? "text-emerald-400" : "text-red-400"
                }
              >
                {lastSummary.success ? "✓ Ping OK" : "✗ Falhou"}
                {" | "}
                {lastSummary.totalPackets} pacotes | {lastSummary.totalTicks}{" "}
                ticks
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="bg-slate-800 text-gray-300 text-[10px] rounded px-1.5 py-0.5 border border-white/10"
            aria-label="Filtrar logs por nível"
          >
            <option value="all">Todos</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="success">Success</option>
          </select>

          <button
            onClick={reset}
            className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
            aria-label="Limpar console"
          >
            Limpar
          </button>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Fechar console"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs space-y-0.5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {filteredLogs.length === 0 && (
          <p className="text-gray-600 italic py-4 text-center">
            Execute uma simulação para ver os logs aqui...
          </p>
        )}

        {filteredLogs.map((log, idx) => {
          const style = LEVEL_STYLES[log.level];
          const isExpanded = expandedLogId === idx;

          return (
            <div
              key={`${log.timestamp}-${idx}`}
              className={`flex items-start gap-2 py-0.5 px-2 rounded cursor-pointer hover:bg-white/5 transition-colors ${
                isExpanded ? style.bg : ""
              }`}
              onClick={() => setExpandedLogId(isExpanded ? null : idx)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setExpandedLogId(isExpanded ? null : idx);
                }
              }}
            >
              <span className={style.color} aria-hidden="true">
                {style.icon}
              </span>
              <span className="text-gray-500 flex-shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString("pt-BR")}]
              </span>
              <span className="text-cyan-400 flex-shrink-0 min-w-[80px]">
                {log.source}:
              </span>
              <div className="flex-1">
                <span className="text-gray-300">{log.message}</span>
                {isExpanded && log.details && (
                  <div className="mt-1 text-[10px] text-gray-500 pl-2 border-l border-white/10">
                    {log.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimConsole;
