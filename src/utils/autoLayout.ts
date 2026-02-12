// ─── Auto-Layout com Dagre ──────────────────────────────────────────────────
// Organiza topologias bagunçadas automaticamente usando layout de grafos.

import dagre from "dagre";
import type { Node, Edge } from "reactflow";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 90;

export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

/**
 * Aplica layout automático aos nós usando o algoritmo Dagre.
 * Retorna novos nós com posições atualizadas.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 100,
    edgesep: 40,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
