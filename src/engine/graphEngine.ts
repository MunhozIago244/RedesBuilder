// ─── Graph Engine ───────────────────────────────────────────────────────────
// Motor de grafos: BFS, DFS, detecção de caminhos e adjacência.
// Separação total da lógica de UI — funções puras.

import type { Node, Edge } from "reactflow";
import type { NetworkDeviceData } from "@/types/network";

type NetworkNode = Node<NetworkDeviceData>;

// ─── Adjacency List Builder ─────────────────────────────────────────────────

export function buildAdjacencyList(
  nodes: NetworkNode[],
  edges: Edge[],
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  for (const node of nodes) {
    adj.set(node.id, new Set());
  }

  for (const edge of edges) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  return adj;
}

// ─── BFS — Busca em Largura ────────────────────────────────────────────────

export function bfs(
  adj: Map<string, Set<string>>,
  startId: string,
  endId: string,
): string[] | null {
  if (startId === endId) return [startId];

  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [startId];
  visited.add(startId);
  parent.set(startId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    const neighbors = adj.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === endId) {
        return reconstructPath(parent, startId, endId);
      }

      queue.push(neighbor);
    }
  }

  return null; // Sem caminho
}

function reconstructPath(
  parent: Map<string, string | null>,
  start: string,
  end: string,
): string[] {
  const path: string[] = [];
  let current: string | null = end;
  while (current !== null) {
    path.unshift(current);
    current = parent.get(current) ?? null;
    if (current === start) {
      path.unshift(start);
      break;
    }
  }
  return path;
}

// ─── Find Shortest Path ────────────────────────────────────────────────────

export function findShortestPath(
  nodes: NetworkNode[],
  edges: Edge[],
  sourceId: string,
  targetId: string,
): string[] | null {
  const adj = buildAdjacencyList(nodes, edges);
  return bfs(adj, sourceId, targetId);
}

// ─── Find Edge Between Two Nodes ────────────────────────────────────────────

export function findEdgeBetweenNodes(
  edges: Edge[],
  nodeA: string,
  nodeB: string,
): Edge | undefined {
  return edges.find(
    (e) =>
      (e.source === nodeA && e.target === nodeB) ||
      (e.source === nodeB && e.target === nodeA),
  );
}

// ─── Get Edges Along Path ───────────────────────────────────────────────────

export function getEdgesAlongPath(edges: Edge[], path: string[]): string[] {
  const edgeIds: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edge = findEdgeBetweenNodes(edges, path[i], path[i + 1]);
    if (edge) {
      edgeIds.push(edge.id);
    }
  }
  return edgeIds;
}

// ─── Get All Connected Components ───────────────────────────────────────────

export function getConnectedComponents(
  nodes: NetworkNode[],
  edges: Edge[],
): string[][] {
  const adj = buildAdjacencyList(nodes, edges);
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const stack = [node.id];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = adj.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  return components;
}

// ─── Get Node Degree ────────────────────────────────────────────────────────

export function getNodeDegree(edges: Edge[], nodeId: string): number {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}
