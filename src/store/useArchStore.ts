// ─── useArchStore.ts ─────────────────────────────────────────────────────────
// Zustand store para o Architecture Builder.
// Mesmo padrão do useNetworkStore — nodes, edges, seleção, undo/redo.

import { create } from "zustand";
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  MarkerType,
} from "reactflow";
import type {
  ArchNodeData,
  ArchEdgeData,
  ArchComponentTemplate,
  CommunicationProtocol,
  DataFlowDirection,
} from "@/types/arch";
import { ARCH_COMPONENT_TEMPLATES, SUGGESTED_PROTOCOLS } from "@/types/arch";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let _idCounter = 0;
const nextId = () => `arch-${Date.now()}-${++_idCounter}`;

function createNodeFromTemplate(
  template: ArchComponentTemplate,
  position: { x: number; y: number },
): Node<ArchNodeData> {
  return {
    id: nextId(),
    type: template.type,
    position,
    data: {
      label: template.label,
      componentType: template.type,
      category: template.category,
      technology: template.defaultTech,
      color: template.color,
      icon: template.icon,
      ...template.defaultData,
    },
  };
}

function guessProtocol(
  sourceType?: string,
  targetType?: string,
): CommunicationProtocol {
  if (
    targetType &&
    SUGGESTED_PROTOCOLS[targetType as keyof typeof SUGGESTED_PROTOCOLS]
  ) {
    return SUGGESTED_PROTOCOLS[
      targetType as keyof typeof SUGGESTED_PROTOCOLS
    ]![0];
  }
  if (
    sourceType &&
    SUGGESTED_PROTOCOLS[sourceType as keyof typeof SUGGESTED_PROTOCOLS]
  ) {
    return SUGGESTED_PROTOCOLS[
      sourceType as keyof typeof SUGGESTED_PROTOCOLS
    ]![0];
  }
  return "HTTPS";
}

function guessDirection(
  sourceType?: string,
  targetType?: string,
): DataFlowDirection {
  const eventTypes = ["message-queue", "event-bus", "pub-sub"];
  if (
    eventTypes.includes(sourceType ?? "") ||
    eventTypes.includes(targetType ?? "")
  ) {
    return "event-driven";
  }
  if (targetType === "websocket-server" || sourceType === "websocket-server") {
    return "bidirectional";
  }
  return "unidirectional";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STORE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface ArchState {
  nodes: Node<ArchNodeData>[];
  edges: Edge<ArchEdgeData>[];
  selectedNodeId: string | null;

  // ── Direct setters (for templates / restore) ──
  setNodes: (nodes: Node<ArchNodeData>[]) => void;
  setEdges: (edges: Edge<ArchEdgeData>[]) => void;

  // ── Node operations ──
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (componentType: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<ArchNodeData>) => void;

  // ── Edge operations ──
  updateEdgeData: (edgeId: string, data: Partial<ArchEdgeData>) => void;
  removeEdge: (edgeId: string) => void;

  // ── Undo/Redo ──
  history: { nodes: Node<ArchNodeData>[]; edges: Edge<ArchEdgeData>[] }[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CREATE STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useArchStore = create<ArchState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  // ── Direct setters ──
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // ── History ──
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      nodes: JSON.parse(JSON.stringify(prev.nodes)),
      edges: JSON.parse(JSON.stringify(prev.edges)),
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: JSON.parse(JSON.stringify(next.nodes)),
      edges: JSON.parse(JSON.stringify(next.edges)),
      historyIndex: historyIndex + 1,
    });
  },

  // ── React Flow callbacks ──
  onNodesChange: (changes) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as Node<ArchNodeData>[],
    }));
  },

  onEdgesChange: (changes) => {
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges) as Edge<ArchEdgeData>[],
    }));
  },

  onConnect: (connection: Connection) => {
    const { nodes, edges, pushHistory } = get();
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    // Evitar duplicata
    const exists = edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    if (exists) return;

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    const protocol = guessProtocol(sourceNode?.type, targetNode?.type);
    const direction = guessDirection(sourceNode?.type, targetNode?.type);

    pushHistory();

    const newEdge: Edge<ArchEdgeData> = {
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "archEdge",
      animated: direction === "event-driven",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      data: {
        protocol,
        direction,
        dataFormat:
          protocol === "GraphQL"
            ? "JSON"
            : protocol === "gRPC"
              ? "Protobuf"
              : "JSON",
        authenticated: false,
      },
    };

    set((s) => ({ edges: [...s.edges, newEdge] }));
  },

  addNode: (componentType, position) => {
    const template = ARCH_COMPONENT_TEMPLATES.find(
      (t) => t.type === componentType,
    );
    if (!template) return;

    const { pushHistory } = get();
    pushHistory();

    const node = createNodeFromTemplate(template, position);
    set((s) => ({ nodes: [...s.nodes, node] }));
  },

  removeNode: (nodeId) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeData: (nodeId, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    }));
  },

  updateEdgeData: (edgeId, data) => {
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data!, ...data } } : e,
      ),
    }));
  },

  removeEdge: (edgeId) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) }));
  },
}));
