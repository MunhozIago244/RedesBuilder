// ─── Simulation Engine ──────────────────────────────────────────────────────
// Motor de simulação: ping, traceroute, geração de headers de pacotes.

import type { Node, Edge } from "reactflow";
import type {
  NetworkDeviceData,
  PacketHeader,
  SimulationResult,
} from "@/types/network";
import { findShortestPath } from "./graphEngine";

type NetworkNode = Node<NetworkDeviceData>;

// ─── Ping Simulation ────────────────────────────────────────────────────────

/**
 * Simula um ICMP ping entre dois dispositivos.
 * Retorna o resultado com caminho, hops, latência simulada e headers.
 */
export function simulatePing(
  nodes: NetworkNode[],
  edges: Edge[],
  sourceId: string,
  targetId: string,
): SimulationResult {
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const targetNode = nodes.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) {
    return createFailure(["Dispositivo de origem ou destino não encontrado"]);
  }

  // Verificar se os dispositivos estão online
  if (sourceNode.data.status === "offline") {
    return createFailure([`${sourceNode.data.label} está offline`]);
  }
  if (targetNode.data.status === "offline") {
    return createFailure([`${targetNode.data.label} está offline`]);
  }

  // Verificar link status
  if (sourceNode.data.linkStatus === "down") {
    return createFailure([`Link de ${sourceNode.data.label} está down`]);
  }

  // Buscar caminho
  const path = findShortestPath(nodes, edges, sourceId, targetId);

  if (!path) {
    return createFailure([
      "Destination Host Unreachable",
      "Não há caminho entre os dispositivos",
    ]);
  }

  // Verificar se todos os nós no caminho estão online
  const offlineNodes = path
    .map((id) => nodes.find((n) => n.id === id))
    .filter(
      (n) => n && (n.data.status === "offline" || n.data.linkStatus === "down"),
    );

  if (offlineNodes.length > 0) {
    return {
      success: false,
      path,
      hops: path.length - 1,
      latency: 0,
      packets: [],
      errors: offlineNodes.map(
        (n) =>
          `${n!.data.label} está ${n!.data.status === "offline" ? "offline" : "com link down"}`,
      ),
    };
  }

  // Verificar configuração IP
  const ipErrors = validatePathIpConfig(nodes, path);
  if (ipErrors.length > 0) {
    return {
      success: false,
      path,
      hops: path.length - 1,
      latency: 0,
      packets: [],
      errors: ipErrors,
    };
  }

  // Gerar headers dos pacotes
  const packets = generatePacketHeaders(nodes, path);

  // Calcular latência simulada
  const hops = path.length - 1;
  const baseLatency = 2; // ms por hop
  const jitter = Math.random() * 5;
  const latency = Math.round(hops * baseLatency + jitter);

  // ESTÁGIO 3 FIX: Removida variável `edgeIds` que era computada mas nunca
  // utilizada no retorno, desperdiçando ciclos de CPU.

  return {
    success: true,
    path,
    hops,
    latency,
    packets,
    errors: [],
  };
}

// ─── Packet Header Generation ───────────────────────────────────────────────

function generatePacketHeaders(
  nodes: NetworkNode[],
  path: string[],
): PacketHeader[] {
  const headers: PacketHeader[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const currentNode = nodes.find((n) => n.id === path[i]);
    const nextNode = nodes.find((n) => n.id === path[i + 1]);

    if (!currentNode || !nextNode) continue;

    // Nó de origem original e destino final
    const srcNode = nodes.find((n) => n.id === path[0])!;
    const dstNode = nodes.find((n) => n.id === path[path.length - 1])!;

    headers.push({
      layer2: {
        srcMac: currentNode.data.macAddress || "00:00:00:00:00:00",
        dstMac: nextNode.data.macAddress || "00:00:00:00:00:00",
        etherType: "0x0800", // IPv4
      },
      layer3: {
        srcIp: srcNode.data.ipAddress || "0.0.0.0",
        dstIp: dstNode.data.ipAddress || "0.0.0.0",
        ttl: 64 - i,
        protocol: "ICMP",
      },
    });
  }

  return headers;
}

// ─── IP Path Validation ─────────────────────────────────────────────────────

function validatePathIpConfig(nodes: NetworkNode[], path: string[]): string[] {
  const errors: string[] = [];
  const srcNode = nodes.find((n) => n.id === path[0]);
  const dstNode = nodes.find((n) => n.id === path[path.length - 1]);

  if (!srcNode || !dstNode) return ["Nó não encontrado"];

  // Dispositivos finais precisam de IP
  const needsIp = (type: string) => !["switch-l2"].includes(type);

  if (needsIp(srcNode.data.deviceType) && !srcNode.data.ipAddress) {
    errors.push(`${srcNode.data.label} não tem endereço IP configurado`);
  }

  if (needsIp(dstNode.data.deviceType) && !dstNode.data.ipAddress) {
    errors.push(`${dstNode.data.label} não tem endereço IP configurado`);
  }

  return errors;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFailure(errors: string[]): SimulationResult {
  return {
    success: false,
    path: [],
    hops: 0,
    latency: 0,
    packets: [],
    errors,
  };
}

/**
 * Gera texto de resultado do ping para exibição.
 */
export function formatPingResult(
  result: SimulationResult,
  targetLabel: string,
): string {
  if (!result.success) {
    return [
      `Ping para ${targetLabel}: FALHOU`,
      ...result.errors.map((e) => `  ✗ ${e}`),
    ].join("\n");
  }

  return [
    `Ping para ${targetLabel}: SUCESSO`,
    `  Hops: ${result.hops}`,
    `  Latência: ~${result.latency}ms`,
    `  TTL: ${64 - result.hops}`,
    `  Caminho: ${result.path.length} nós`,
  ].join("\n");
}
