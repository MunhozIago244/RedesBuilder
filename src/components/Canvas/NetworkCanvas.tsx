// ─── Network Canvas ─────────────────────────────────────────────────────────
// Canvas principal interativo com React Flow.
// AUDITORIA:
//   Estágio 2 — useMemo em objetos estáticos (defaultEdgeOptions, fitViewOptions,
//               snapGrid, proOptions), nodeColor callback memoizado.
//               Removidos useCallback wrappers desnecessários que apenas delegavam
//               para store actions já estáveis (Zustand retorna refs estáveis).

import React, { useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

import { nodeTypes } from "@/components/Nodes";
import { edgeTypes } from "@/components/Edges";
import { useNetworkStore } from "@/store/useNetworkStore";
import { useSimulation } from "@/hooks/useSimulation";
import { usePacketAnimation } from "@/hooks/usePacketAnimation";
import { PacketAnimationOverlay } from "@/components/Simulation/PacketEnvelope";
import type { DeviceType } from "@/types/network";

// PERF: Constantes hoistadas fora do componente — nunca re-criadas.
const DEFAULT_EDGE_OPTIONS = { type: "smart" as const, animated: false };
const FIT_VIEW_OPTIONS = { padding: 0.2 };
const SNAP_GRID: [number, number] = [15, 15];
const PRO_OPTIONS = { hideAttribution: true };

// PERF: Record de cores para o MiniMap — estável, fora do render.
const MINIMAP_COLORS: Record<string, string> = {
  router: "#22d3ee",
  "switch-l2": "#60a5fa",
  "switch-l3": "#818cf8",
  "access-point": "#2dd4bf",
  pc: "#34d399",
  laptop: "#4ade80",
  "ip-phone": "#fb923c",
  server: "#a855f7",
  printer: "#fbbf24",
  isp: "#fb7185",
  cloud: "#38bdf8",
  firewall: "#f87171",
  // IoT / Smart Home
  "smart-tv": "#8b5cf6",
  "smart-speaker": "#ec4899",
  "smart-light": "#facc15",
  "security-camera": "#ef4444",
  "robot-vacuum": "#14b8a6",
  "smart-thermostat": "#f97316",
  "game-console": "#6366f1",
  "streaming-box": "#fb7185",
};
const minimapNodeColor = (n: { type?: string }) =>
  MINIMAP_COLORS[n.type ?? ""] ?? "#475569";

const MINIMAP_STYLE = {
  backgroundColor: "rgba(15, 23, 42, 0.8)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.05)",
};

const NetworkCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const nodes = useNetworkStore((s) => s.nodes);
  const edges = useNetworkStore((s) => s.edges);
  const onNodesChange = useNetworkStore((s) => s.onNodesChange);
  const onEdgesChange = useNetworkStore((s) => s.onEdgesChange);
  const onConnect = useNetworkStore((s) => s.onConnect);
  const addNode = useNetworkStore((s) => s.addNode);
  const selectNode = useNetworkStore((s) => s.selectNode);
  const simulationMode = useNetworkStore((s) => s.simulationMode);

  const { handleNodeClickInSimulation } = useSimulation();
  const { animatingPackets, recentDrops, recentArrivals, inspectPacket } =
    usePacketAnimation();

  // ─── Drag & Drop from Sidebar ───────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow-type",
      ) as DeviceType;
      if (!type || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  // ─── Node Click ─────────────────────────────────────────────────────

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      if (simulationMode) {
        handleNodeClickInSimulation(node.id);
      } else {
        selectNode(node.id);
      }
    },
    [simulationMode, handleNodeClickInSimulation, selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        /* PERF: Store actions do Zustand são refs estáveis — passar diretamente
           elimina os useCallback wrappers redundantes que existiam antes. */
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.1}
        maxZoom={4}
        deleteKeyCode={["Delete", "Backspace"]}
        multiSelectionKeyCode="Shift"
        snapToGrid
        snapGrid={SNAP_GRID}
        className="bg-slate-950"
        proOptions={PRO_OPTIONS}
      >
        {/* Background Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(148, 163, 184, 0.08)"
        />

        {/* MiniMap — nodeColor e style são refs estáveis (Estágio 2) */}
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={minimapNodeColor}
          maskColor="rgba(2, 6, 23, 0.85)"
          style={MINIMAP_STYLE}
          pannable
          zoomable
        />

        {/* Controls */}
        <Controls
          showInteractive={false}
          className="!bg-slate-900/80 !border-white/10 !rounded-xl !shadow-2xl [&>button]:!bg-slate-800/60 [&>button]:!border-white/5 [&>button]:!text-gray-400 [&>button:hover]:!bg-slate-700/60 [&>button:hover]:!text-white [&>button]:!rounded-lg"
        />

        {/* Simulation Mode Indicator — aria-live para leitores de tela (Estágio 4) */}
        {simulationMode && (
          <Panel position="top-center">
            <div
              className="px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 backdrop-blur-xl"
              role="status"
              aria-live="polite"
            >
              <span className="text-xs font-medium text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Modo Simulação Ativo — Clique nos nós para definir origem e
                destino
              </span>
            </div>
          </Panel>
        )}

        {/* Packet Animation Overlay — pacotes trafegando visualmente */}
        {simulationMode && (
          <PacketAnimationOverlay
            animatingPackets={animatingPackets}
            recentDrops={recentDrops}
            recentArrivals={recentArrivals}
            onInspectPacket={inspectPacket}
          />
        )}
      </ReactFlow>
    </div>
  );
};

export default NetworkCanvas;
