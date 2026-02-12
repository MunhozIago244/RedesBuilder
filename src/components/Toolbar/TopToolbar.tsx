// ─── Top Toolbar ────────────────────────────────────────────────────────────
// Barra de ferramentas superior com controles de simulação, debug e layout.
// AUDITORIA:
//   Estágio 2 — Selectores computados para nodes.length/edges.length
//               (evita re-render a cada mudança de posição de nó).
//   Estágio 3 — Toast auto-dismiss após 6 segundos.
//   Estágio 4 — aria-labels em todos os botões, role="status" no toast,
//               aria-live="polite" na região de resultado do ping.

import React, { memo, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Bug,
  LayoutGrid,
  Undo2,
  Redo2,
  Trash2,
  Zap,
  Activity,
  Send,
  RotateCcw,
  CircleDot,
} from "lucide-react";
import { useNetworkStore } from "@/store/useNetworkStore";
import { useSimulation } from "@/hooks/useSimulation";

// ─── Toolbar Button ─────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "success" | "danger" | "warning" | "purple";
  disabled?: boolean;
  badge?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = memo(
  ({
    icon,
    label,
    onClick,
    active = false,
    variant = "default",
    disabled = false,
    badge,
  }) => {
    const variantStyles = {
      default: active
        ? "bg-slate-700/80 border-white/20 text-white"
        : "bg-slate-800/40 border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/10",
      success: active
        ? "bg-green-500/20 border-green-500/40 text-green-400"
        : "bg-slate-800/40 border-white/5 text-gray-400 hover:text-green-400 hover:border-green-500/20",
      danger:
        "bg-slate-800/40 border-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/20",
      warning: active
        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
        : "bg-slate-800/40 border-white/5 text-gray-400 hover:text-amber-400 hover:border-amber-500/20",
      purple: active
        ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
        : "bg-slate-800/40 border-white/5 text-gray-400 hover:text-purple-400 hover:border-purple-500/20",
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
        relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
        border backdrop-blur-sm transition-all duration-200
        ${variantStyles[variant]}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
        title={label}
        aria-label={label}
      >
        {icon}
        <span className="hidden xl:inline">{label}</span>
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-[8px] font-bold text-white">
            {badge}
          </span>
        )}
      </button>
    );
  },
);

ToolbarButton.displayName = "ToolbarButton";

// ─── Divider ────────────────────────────────────────────────────────────────

const Divider: React.FC = () => <div className="w-px h-6 bg-white/5 mx-1" />;

// ─── Auto-dismiss Toast ─────────────────────────────────────────────────────
// ESTÁGIO 3: Toast precisa desaparecer automaticamente para não bloquear a UI.
const TOAST_DURATION_MS = 6000;

// ─── Main Toolbar ───────────────────────────────────────────────────────────

const TopToolbar: React.FC = () => {
  const simulationMode = useNetworkStore((s) => s.simulationMode);
  const debugMode = useNetworkStore((s) => s.debugMode);
  const toggleSimulation = useNetworkStore((s) => s.toggleSimulation);
  const toggleDebug = useNetworkStore((s) => s.toggleDebug);
  const autoLayout = useNetworkStore((s) => s.autoLayout);
  const undo = useNetworkStore((s) => s.undo);
  const redo = useNetworkStore((s) => s.redo);
  const clearCanvas = useNetworkStore((s) => s.clearCanvas);
  const resetPingStore = useNetworkStore((s) => s.resetPing);

  // PERF: Selectores computados — só mudam quando a quantidade real muda,
  // não quando nós são arrastados (mudança de posição não altera .length).
  const nodeCount = useNetworkStore((s) => s.nodes.length);
  const edgeCount = useNetworkStore((s) => s.edges.length);

  const { ping, executePing, resetPing, sourceLabel, targetLabel } =
    useSimulation();

  // ESTÁGIO 3: Auto-dismiss do toast de resultado do ping
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (ping.result) {
      // Limpar timer anterior se houver
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        resetPingStore();
      }, TOAST_DURATION_MS);
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [ping.result, resetPingStore]);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-slate-900/70 backdrop-blur-xl border-b border-white/5"
      role="toolbar"
      aria-label="Barra de ferramentas principal"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <Zap size={18} className="text-cyan-400" />
        <span className="text-sm font-bold text-gray-100 tracking-wide">
          NetBuilder <span className="text-cyan-400">Academy</span>
        </span>
      </div>

      <Divider />

      {/* History */}
      <ToolbarButton
        icon={<Undo2 size={14} />}
        label="Desfazer"
        onClick={undo}
      />
      <ToolbarButton
        icon={<Redo2 size={14} />}
        label="Refazer"
        onClick={redo}
      />

      <Divider />

      {/* Layout */}
      <ToolbarButton
        icon={<LayoutGrid size={14} />}
        label="Auto-Layout"
        onClick={autoLayout}
        disabled={nodeCount === 0}
      />

      <Divider />

      {/* Simulation Mode */}
      <ToolbarButton
        icon={simulationMode ? <Square size={14} /> : <Play size={14} />}
        label={simulationMode ? "Parar Simulação" : "Modo Simulação"}
        onClick={toggleSimulation}
        active={simulationMode}
        variant="success"
      />

      {/* Ping Controls — Visíveis apenas em modo simulação */}
      {simulationMode && (
        <>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-white/5"
            aria-label="Status do ping"
          >
            <CircleDot
              size={12}
              className={ping.source ? "text-green-400" : "text-gray-600"}
            />
            <span className="text-[10px] text-gray-400">
              {ping.source ? sourceLabel : "Selecione origem"}
            </span>
            <span className="text-gray-600 mx-1" aria-hidden="true">
              →
            </span>
            <Activity
              size={12}
              className={ping.target ? "text-red-400" : "text-gray-600"}
            />
            <span className="text-[10px] text-gray-400">
              {ping.target ? targetLabel : "Selecione destino"}
            </span>
          </div>

          <ToolbarButton
            icon={<Send size={14} />}
            label="Executar Ping"
            onClick={executePing}
            variant="purple"
            disabled={!ping.source || !ping.target || ping.isRunning}
          />

          <ToolbarButton
            icon={<RotateCcw size={14} />}
            label="Resetar"
            onClick={resetPing}
            disabled={!ping.source}
          />
        </>
      )}

      <Divider />

      {/* Debug Mode */}
      <ToolbarButton
        icon={<Bug size={14} />}
        label="Debug L2/L3"
        onClick={toggleDebug}
        active={debugMode}
        variant="warning"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <div
        className="flex items-center gap-3 text-[10px] text-gray-500 font-mono"
        aria-label="Estatísticas da rede"
      >
        <span>{nodeCount} nós</span>
        <span>{edgeCount} conexões</span>
      </div>

      <Divider />

      {/* Clear */}
      <ToolbarButton
        icon={<Trash2 size={14} />}
        label="Limpar"
        onClick={clearCanvas}
        variant="danger"
        disabled={nodeCount === 0}
      />

      {/* Ping Result Toast — auto-dismiss (Estágio 3) + role/aria-live (Estágio 4) */}
      {ping.result && (
        <div
          className={`
            fixed top-16 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl
            backdrop-blur-xl border animate-fade-in max-w-xs
            ${
              ping.result.success
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }
          `}
          role="status"
          aria-live="polite"
        >
          <div className="text-sm font-bold mb-1">
            {ping.result.success ? "✓ Ping bem-sucedido!" : "✗ Ping falhou!"}
          </div>
          {ping.result.success ? (
            <div className="text-xs space-y-0.5 text-gray-300">
              <div>Hops: {ping.result.hops}</div>
              <div>Latência: ~{ping.result.latency}ms</div>
              <div>TTL: {64 - ping.result.hops}</div>
            </div>
          ) : (
            <div className="text-xs space-y-0.5">
              {ping.result.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopToolbar;
