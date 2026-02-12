// ─── useSimulationEngine Hook ───────────────────────────────────────────────
// Hook React que expõe o Orchestrator para a UI.
// Mantém o estado reativo via subscription no EventBus.

import { useState, useEffect, useCallback, useRef } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import {
  simulationOrchestrator,
  type SimulationState,
} from "@/engine/simulationOrchestrator";
import type {
  SimulationSummary,
  SimulationSpeed,
  ConsoleLogEvent,
} from "@/types/simulation";

export interface SimulationEngineAPI {
  /** Estado reativo da simulação */
  state: SimulationState;
  /** Executar ping entre dois nós */
  executePing: (
    sourceId: string,
    targetId: string,
  ) => Promise<SimulationSummary>;
  /** Alterar velocidade */
  setSpeed: (speed: SimulationSpeed) => void;
  /** Resetar engine */
  reset: () => void;
  /** Se a engine está inicializada */
  isInitialized: boolean;
  /** Último resumo de simulação */
  lastSummary: SimulationSummary | null;
  /** Logs do console */
  logs: ConsoleLogEvent[];
}

/**
 * Hook principal para acessar o motor de simulação.
 *
 * @example
 * ```tsx
 * function SimPanel() {
 *   const { state, executePing, logs } = useSimulationEngine();
 *
 *   return (
 *     <div>
 *       <button onClick={() => executePing(sourceId, targetId)}>Ping</button>
 *       {logs.map(log => <LogLine key={log.timestamp} log={log} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSimulationEngine(): SimulationEngineAPI {
  const nodes = useNetworkStore((s) => s.nodes);
  const edges = useNetworkStore((s) => s.edges);

  const [state, setState] = useState<SimulationState>(
    simulationOrchestrator.getState(),
  );
  const [lastSummary, setLastSummary] = useState<SimulationSummary | null>(
    null,
  );
  const [logs, setLogs] = useState<ConsoleLogEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const eventBus = simulationOrchestrator.eventBus;

  // Manter referência atualizada dos nós/edges
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Inicializar/atualizar o grafo no orchestrator quando muda
  useEffect(() => {
    simulationOrchestrator.initialize(nodes, edges);
    setIsInitialized(true);
  }, [nodes, edges]);

  // Subscription nos eventos para manter estado reativo
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Atualizar estado a cada tick
    unsubscribers.push(
      eventBus.on("sim:tick", () => {
        setState(simulationOrchestrator.getState());
      }),
    );

    // Logs
    const logHandler = (log: ConsoleLogEvent) => {
      setLogs((prev) => [...prev.slice(-200), log]); // Manter últimos 200 logs
    };
    unsubscribers.push(eventBus.on("console:log", logHandler));
    unsubscribers.push(eventBus.on("console:error", logHandler));
    unsubscribers.push(eventBus.on("console:warn", logHandler));

    // Simulação completa
    unsubscribers.push(
      eventBus.on("sim:complete", (summary) => {
        setLastSummary(summary);
        setState(simulationOrchestrator.getState());
      }),
    );

    // Start/Reset
    unsubscribers.push(
      eventBus.on("sim:start", () =>
        setState(simulationOrchestrator.getState()),
      ),
    );
    unsubscribers.push(
      eventBus.on("sim:reset", () => {
        setState(simulationOrchestrator.getState());
        setLogs([]);
        setLastSummary(null);
      }),
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [eventBus]);

  const executePing = useCallback(
    async (sourceId: string, targetId: string) => {
      // Re-inicializar com estado mais recente antes de executar
      simulationOrchestrator.initialize(nodesRef.current, edgesRef.current);
      setLogs([]);
      const summary = await simulationOrchestrator.executePing(
        sourceId,
        targetId,
      );
      setLastSummary(summary);
      return summary;
    },
    [],
  );

  const setSpeed = useCallback((speed: SimulationSpeed) => {
    simulationOrchestrator.setSpeed(speed);
  }, []);

  const reset = useCallback(() => {
    simulationOrchestrator.reset();
    setLogs([]);
    setLastSummary(null);
  }, []);

  return {
    state,
    executePing,
    setSpeed,
    reset,
    isInitialized,
    lastSummary,
    logs,
  };
}
