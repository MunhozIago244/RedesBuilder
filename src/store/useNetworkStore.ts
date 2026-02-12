// ─── Zustand Store — Gerenciamento de Estado Central ────────────────────────
// Single source of truth para todo o grafo de rede.
// CAMADA DE REALISMO: Integra HardwareCatalog, port management e CLI context.

import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "reactflow";
import type {
  NetworkDeviceData,
  DeviceType,
  NetworkStore,
  PingState,
  HistoryEntry,
  PendingConnection,
  NetworkInterface,
} from "@/types/network";
import { DEVICE_TEMPLATES } from "@/types/network";
import {
  getDefaultModelForType,
  createInterfacesFromBlueprint,
} from "@/data/deviceLibrary";
import { generateMacAddress, generateNodeId } from "@/utils/macGenerator";
import {
  validateConnection,
  isDuplicateConnection,
} from "@/engine/validationEngine";
import { simulatePing } from "@/engine/simulationEngine";
import { getEdgesAlongPath } from "@/engine/graphEngine";
import { getLayoutedElements } from "@/utils/autoLayout";
import { MEDIA_COMPATIBILITY } from "@/types/network";

// ─── Initial State ──────────────────────────────────────────────────────────

const initialPing: PingState = {
  source: null,
  target: null,
  isRunning: false,
  result: null,
  animatingEdgeIndex: -1,
  animatingEdges: [],
};

const MAX_HISTORY = 50;

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,
  simulationMode: false,
  debugMode: false,
  ping: initialPing,
  history: [],
  historyIndex: -1,

  // Port Selection Flow
  pendingConnection: null,
  showPortModal: false,

  // Direct setters
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // ─── Node Actions ─────────────────────────────────────────────────────

  addNode: (
    type: DeviceType,
    position: { x: number; y: number },
    modelId?: string,
  ) => {
    // Tentar encontrar modelo de hardware pelo modelId ou tipo
    const hwModel = modelId
      ? undefined // TODO: getHardwareModel(modelId) quando sidebar suportar
      : getDefaultModelForType(type);

    // Fallback para DEVICE_TEMPLATES se nenhum modelo de hardware encontrado
    const template = DEVICE_TEMPLATES.find((t) => t.type === type);
    if (!template && !hwModel) return;

    const id = generateNodeId(type);
    const macAddress = generateMacAddress(type);

    // Gerar interfaces a partir do blueprint de hardware (ou vazio para genéricos sem modelo)
    const interfaces: NetworkInterface[] = hwModel
      ? createInterfacesFromBlueprint(hwModel.interfaceBlueprint, type)
      : [];

    const defaultData = hwModel?.defaultData ?? template?.defaultData ?? {};
    const label = hwModel?.modelName ?? template?.label ?? type;

    const newNode: Node<NetworkDeviceData> = {
      id,
      type, // Matches custom node type registered in React Flow
      position,
      data: {
        label: `${label} ${get().nodes.filter((n) => n.data.deviceType === type).length + 1}`,
        deviceType: type,
        hardwareModel: hwModel?.modelId,
        ipAddress: defaultData.ipAddress ?? "",
        subnetMask: defaultData.subnetMask ?? "255.255.255.0",
        macAddress,
        gateway: defaultData.gateway ?? "",
        status: "online",
        linkStatus: "up",
        interfaces,
      },
    };

    get().saveHistory();
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
  },

  removeNode: (id: string) => {
    get().saveHistory();
    set((state) => {
      // Coletar IDs das edges que serão removidas junto com o nó
      const removedEdgeIds = new Set(
        state.edges
          .filter((e) => e.source === id || e.target === id)
          .map((e) => e.id),
      );

      // Limpar connectedEdgeId nas interfaces dos nós sobreviventes
      const updatedNodes = state.nodes
        .filter((n) => n.id !== id)
        .map((node) => {
          const hasAffected = node.data.interfaces.some(
            (iface) =>
              iface.connectedEdgeId &&
              removedEdgeIds.has(iface.connectedEdgeId),
          );
          if (!hasAffected) return node;
          return {
            ...node,
            data: {
              ...node.data,
              interfaces: node.data.interfaces.map((iface) =>
                iface.connectedEdgeId &&
                removedEdgeIds.has(iface.connectedEdgeId)
                  ? { ...iface, connectedEdgeId: null }
                  : iface,
              ),
            },
          };
        });

      return {
        nodes: updatedNodes as Node<NetworkDeviceData>[],
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId:
          state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  },

  updateNodeData: (id: string, data: Partial<NetworkDeviceData>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node,
      ),
    }));
  },

  selectNode: (id: string | null) => {
    const { simulationMode, ping } = get();

    // Em modo simulação, seleção define source/target do ping
    if (simulationMode && id) {
      if (!ping.source) {
        set({ ping: { ...ping, source: id } });
        return;
      }
      if (!ping.target && id !== ping.source) {
        set({ ping: { ...ping, target: id } });
        return;
      }
    }

    set({ selectedNodeId: id });
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(
        changes,
        state.nodes,
      ) as Node<NetworkDeviceData>[],
    }));
  },

  // ─── Edge Actions ─────────────────────────────────────────────────────

  onEdgesChange: (changes: EdgeChange[]) => {
    const removals = changes.filter((c) => c.type === "remove");
    if (removals.length > 0) {
      get().saveHistory();

      // Coletar IDs das edges sendo removidas
      const removedEdgeIds = new Set(
        removals.map((c) => (c as { type: "remove"; id: string }).id),
      );

      // Limpar connectedEdgeId nas interfaces dos nós afetados
      set((state) => {
        const updatedNodes = state.nodes.map((node) => {
          const hasAffected = node.data.interfaces.some(
            (iface) =>
              iface.connectedEdgeId &&
              removedEdgeIds.has(iface.connectedEdgeId),
          );
          if (!hasAffected) return node;
          return {
            ...node,
            data: {
              ...node.data,
              interfaces: node.data.interfaces.map((iface) =>
                iface.connectedEdgeId &&
                removedEdgeIds.has(iface.connectedEdgeId)
                  ? { ...iface, connectedEdgeId: null }
                  : iface,
              ),
            },
          };
        });
        return {
          nodes: updatedNodes as Node<NetworkDeviceData>[],
          edges: applyEdgeChanges(changes, state.edges),
        };
      });
    } else {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      }));
    }
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    // Validar conexão
    const validation = validateConnection(sourceNode, targetNode);

    // Verificar duplicatas
    if (isDuplicateConnection(edges, connection.source, connection.target)) {
      return;
    }

    // Se ambos os nós têm interfaces (hardware catalog), abrir modal de seleção de portas
    const sourceHasPorts = (sourceNode?.data.interfaces.length ?? 0) > 0;
    const targetHasPorts = (targetNode?.data.interfaces.length ?? 0) > 0;

    if (sourceHasPorts && targetHasPorts) {
      set({
        pendingConnection: {
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        },
        showPortModal: true,
      });
      return;
    }

    // Sem portas — criar edge diretamente (fallback para dispositivos sem hardware catalog)
    get().saveHistory();

    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? "bottom-s",
      targetHandle: connection.targetHandle ?? "top-t",
      type: "smart",
      animated: false,
      data: {
        valid: validation.valid,
        reason: validation.reason,
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
  },

  // ─── Port Management ──────────────────────────────────────────────────

  setPendingConnection: (connection: PendingConnection | null) => {
    set({ pendingConnection: connection });
  },

  setShowPortModal: (show: boolean) => {
    set({ showPortModal: show });
    if (!show) {
      set({ pendingConnection: null });
    }
  },

  connectPorts: (
    sourceNodeId: string,
    targetNodeId: string,
    sourceInterfaceId: string,
    targetInterfaceId: string,
  ) => {
    const { nodes, edges, pendingConnection } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return;

    const sourceIface = sourceNode.data.interfaces.find(
      (i) => i.id === sourceInterfaceId,
    );
    const targetIface = targetNode.data.interfaces.find(
      (i) => i.id === targetInterfaceId,
    );

    if (!sourceIface || !targetIface) return;

    // Validação de mídia compatível
    if (!MEDIA_COMPATIBILITY[sourceIface.type]?.includes(targetIface.type)) {
      return;
    }

    // Verificar se portas já estão ocupadas
    if (sourceIface.connectedEdgeId || targetIface.connectedEdgeId) return;

    const validation = validateConnection(sourceNode, targetNode);
    const edgeId = `e-${sourceNodeId}-${targetNodeId}-${sourceInterfaceId}-${targetInterfaceId}`;

    get().saveHistory();

    const newEdge: Edge = {
      id: edgeId,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: pendingConnection?.sourceHandle ?? "bottom-s",
      targetHandle: pendingConnection?.targetHandle ?? "top-t",
      type: "smart",
      animated: false,
      data: {
        valid: validation.valid,
        reason: validation.reason,
        sourceInterface: sourceInterfaceId,
        targetInterface: targetInterfaceId,
      },
    };

    // Atualizar interfaces dos nós com a edge conectada
    const updatedNodes = nodes.map((node) => {
      if (node.id === sourceNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            interfaces: node.data.interfaces.map((iface) =>
              iface.id === sourceInterfaceId
                ? { ...iface, connectedEdgeId: edgeId }
                : iface,
            ),
          },
        };
      }
      if (node.id === targetNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            interfaces: node.data.interfaces.map((iface) =>
              iface.id === targetInterfaceId
                ? { ...iface, connectedEdgeId: edgeId }
                : iface,
            ),
          },
        };
      }
      return node;
    });

    set({
      nodes: updatedNodes as Node<NetworkDeviceData>[],
      edges: [...edges, newEdge],
      pendingConnection: null,
      showPortModal: false,
    });
  },

  disconnectPort: (nodeId: string, interfaceId: string) => {
    const { nodes, edges } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const iface = node.data.interfaces.find((i) => i.id === interfaceId);
    if (!iface?.connectedEdgeId) return;

    const edgeId = iface.connectedEdgeId;

    get().saveHistory();

    // Remover edge
    const newEdges = edges.filter((e) => e.id !== edgeId);

    // Limpar connectedEdgeId de ambos os nós
    const updatedNodes = nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        interfaces: n.data.interfaces.map((i) =>
          i.connectedEdgeId === edgeId ? { ...i, connectedEdgeId: null } : i,
        ),
      },
    }));

    set({
      nodes: updatedNodes as Node<NetworkDeviceData>[],
      edges: newEdges,
    });
  },

  // ─── Mode Toggles ────────────────────────────────────────────────────

  toggleSimulation: () => {
    set((state) => ({
      simulationMode: !state.simulationMode,
      ping: initialPing,
    }));
  },

  toggleDebug: () => {
    set((state) => ({
      debugMode: !state.debugMode,
    }));
  },

  // ─── Ping ─────────────────────────────────────────────────────────────

  setPingSource: (id: string | null) => {
    set((state) => ({
      ping: {
        ...state.ping,
        source: id,
        target: null,
        result: null,
        animatingEdges: [],
        animatingEdgeIndex: -1,
      },
    }));
  },

  setPingTarget: (id: string | null) => {
    set((state) => ({
      ping: { ...state.ping, target: id },
    }));
  },

  runPing: async () => {
    const { nodes, edges, ping } = get();

    if (!ping.source || !ping.target) return;

    set((state) => ({
      ping: {
        ...state.ping,
        isRunning: true,
        result: null,
        animatingEdges: [],
        animatingEdgeIndex: -1,
      },
    }));

    // Simular delay de rede
    await new Promise((r) => setTimeout(r, 300));

    const result = simulatePing(nodes, edges, ping.source, ping.target);

    if (result.success && result.path.length > 1) {
      const edgeIds = getEdgesAlongPath(edges, result.path);

      set((state) => ({
        ping: { ...state.ping, animatingEdges: edgeIds, animatingEdgeIndex: 0 },
      }));

      // Animar pacote hop a hop
      for (let i = 0; i < edgeIds.length; i++) {
        set((state) => ({
          ping: { ...state.ping, animatingEdgeIndex: i },
        }));
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    set((state) => ({
      ping: {
        ...state.ping,
        isRunning: false,
        result,
        animatingEdgeIndex: -1,
      },
    }));
  },

  resetPing: () => {
    set({ ping: initialPing });
  },

  // ─── Auto Layout ──────────────────────────────────────────────────────

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    get().saveHistory();
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, "TB");

    set({ nodes: layoutedNodes as Node<NetworkDeviceData>[] });
  },

  // ─── History (Undo/Redo) ──────────────────────────────────────────────

  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < 0) return;

    const entry = history[historyIndex];
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    // Se for o último entry no redo, não temos dados "futuros"
    if (!entry) return;

    set({
      nodes: entry.nodes,
      edges: entry.edges,
      historyIndex: nextIndex,
    });
  },

  // ─── Canvas ───────────────────────────────────────────────────────────

  clearCanvas: () => {
    get().saveHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      ping: initialPing,
    });
  },
}));
