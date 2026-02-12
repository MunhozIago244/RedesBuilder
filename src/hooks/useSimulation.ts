// ─── Simulation Hook ────────────────────────────────────────────────────────
// Gerencia o fluxo de simulação de ping no canvas.
// v2: Integra com o novo SimulationEngine (EventBus + Orchestrator).
//     Mantém interface de seleção de source/target via click.

import { useCallback, useEffect, useRef } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import { useSimulationEngine } from "@/hooks/useSimulationEngine";

export function useSimulation() {
  const ping = useNetworkStore((s) => s.ping);
  const simulationMode = useNetworkStore((s) => s.simulationMode);
  const nodes = useNetworkStore((s) => s.nodes);
  const setPingSource = useNetworkStore((s) => s.setPingSource);
  const setPingTarget = useNetworkStore((s) => s.setPingTarget);
  const resetPing = useNetworkStore((s) => s.resetPing);

  // Novo engine de simulação
  const engine = useSimulationEngine();
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const handleNodeClickInSimulation = useCallback(
    (nodeId: string) => {
      if (!simulationMode) return;

      if (!ping.source) {
        setPingSource(nodeId);
      } else if (!ping.target && nodeId !== ping.source) {
        setPingTarget(nodeId);
      }
    },
    [simulationMode, ping.source, ping.target, setPingSource, setPingTarget],
  );

  // Auto-executar ping quando source e target são definidos (novo engine)
  useEffect(() => {
    if (ping.source && ping.target && !ping.isRunning && engine.isInitialized) {
      // Usar o novo engine em vez do runPing legado
      const runNewPing = async () => {
        useNetworkStore.setState((s) => ({
          ping: { ...s.ping, isRunning: true, result: null },
        }));
        try {
          const summary = await engineRef.current.executePing(
            ping.source!,
            ping.target!,
          );
          useNetworkStore.setState((s) => ({
            ping: {
              ...s.ping,
              isRunning: false,
              result: {
                success: summary.success,
                path: summary.path,
                hops: summary.path.length - 1,
                latency: summary.totalLatencyMs,
                packets: [],
                errors: summary.errors,
              },
            },
          }));
        } catch {
          useNetworkStore.setState((s) => ({
            ping: {
              ...s.ping,
              isRunning: false,
              result: {
                success: false,
                path: [],
                hops: 0,
                latency: 0,
                packets: [],
                errors: ["Erro interno na simulação."],
              },
            },
          }));
        }
      };
      runNewPing();
    }
  }, [ping.source, ping.target, engine.isInitialized]);

  const executePing = useCallback(async () => {
    if (!ping.source || !ping.target || ping.isRunning) return;
    // Delega para o auto-trigger do useEffect acima
    // (source + target já estão setados)
  }, [ping.source, ping.target, ping.isRunning]);

  const getNodeLabel = useCallback(
    (id: string | null) => {
      if (!id) return "";
      const node = nodes.find((n) => n.id === id);
      return node?.data.label ?? id;
    },
    [nodes],
  );

  return {
    ping,
    simulationMode,
    handleNodeClickInSimulation,
    executePing,
    resetPing,
    sourceLabel: getNodeLabel(ping.source),
    targetLabel: getNodeLabel(ping.target),
    // Novo: expor dados do engine
    engine,
  };
}
