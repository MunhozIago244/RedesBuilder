// ─── ArchCanvas.tsx ──────────────────────────────────────────────────────────
// Canvas principal do Architecture Builder — React Flow + drag & drop.

import React, { useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { useArchStore } from "@/store/useArchStore";
import { archNodeTypes } from "@/components/ArchBuilder/Nodes";
import { archEdgeTypes } from "@/components/ArchBuilder/Edges";
import type { ArchComponentType } from "@/types/arch";

// ── MiniMap colors ───
const MINIMAP_COLORS: Record<string, string> = {
  browser: "#60a5fa",
  "spa-app": "#22d3ee",
  "mobile-app": "#34d399",
  cdn: "#fbbf24",
  "static-site": "#a78bfa",
  "api-gateway": "#f97316",
  "rest-api": "#22d3ee",
  "graphql-api": "#e879f9",
  "websocket-server": "#2dd4bf",
  bff: "#818cf8",
  microservice: "#a855f7",
  monolith: "#6366f1",
  "serverless-fn": "#fbbf24",
  worker: "#fb923c",
  "auth-service": "#f87171",
  "database-sql": "#60a5fa",
  "database-nosql": "#34d399",
  cache: "#ef4444",
  "search-engine": "#fbbf24",
  "object-storage": "#fb923c",
  "message-queue": "#f97316",
  "event-bus": "#22d3ee",
  "pub-sub": "#a78bfa",
  "load-balancer": "#22d3ee",
  "reverse-proxy": "#34d399",
  dns: "#60a5fa",
  "firewall-waf": "#f87171",
  container: "#38bdf8",
  orchestrator: "#818cf8",
  "ci-cd": "#a855f7",
};

const minimapNodeColor = (n: { type?: string }) =>
  MINIMAP_COLORS[n.type ?? ""] ?? "#475569";

const ArchCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useArchStore((s) => s.nodes);
  const edges = useArchStore((s) => s.edges);
  const onNodesChange = useArchStore((s) => s.onNodesChange);
  const onEdgesChange = useArchStore((s) => s.onEdgesChange);
  const onConnect = useArchStore((s) => s.onConnect);
  const addNode = useArchStore((s) => s.addNode);
  const selectNode = useArchStore((s) => s.selectNode);

  // ── Drop handler ──
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const componentType = e.dataTransfer.getData(
        "application/archbuilder-type",
      );
      if (!componentType) return;

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      addNode(componentType as ArchComponentType, position);
    },
    [screenToFlowPosition, addNode],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => selectNode(node.id),
    [selectNode],
  );

  const onPaneClick = useCallback(() => selectNode(null), [selectNode]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={archNodeTypes}
        edgeTypes={archEdgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: "archEdge",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="arch-canvas"
      >
        <Background gap={16} size={1} color="rgba(255,255,255,0.03)" />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bg-slate-900/80 !border-white/5 !rounded-lg !shadow-xl [&>button]:!bg-transparent [&>button]:!border-white/5 [&>button]:!text-gray-400 [&>button:hover]:!bg-white/5 [&>button:hover]:!text-white"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default ArchCanvas;
