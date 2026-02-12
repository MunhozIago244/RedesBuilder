// ─── Packet Factory ─────────────────────────────────────────────────────────
// Fábrica de pacotes com IDs únicos e metadados visuais automáticos.

import type {
  SimPacket,
  PacketSubType,
  L2Header,
  L3Header,
  ARPPayload,
  ICMPPayload,
  PacketVisualMeta,
} from "@/types/simulation";
import { PACKET_VISUALS, BROADCAST_MAC } from "@/types/simulation";

let packetCounter = 0;

/** Resetar contador (para testes ou reset de simulação) */
export function resetPacketCounter(): void {
  packetCounter = 0;
}

/** Gerar ID único para pacote */
function generatePacketId(subType: PacketSubType): string {
  return `pkt-${subType}-${++packetCounter}-${Date.now().toString(36)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARP PACKET FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

/** Criar ARP Request (broadcast) */
export function createARPRequest(
  senderMac: string,
  senderIp: string,
  targetIp: string,
  sourceNodeId: string,
  currentTick: number,
): SimPacket {
  const subType: PacketSubType = "arp-request";
  return {
    id: generatePacketId(subType),
    protocol: "ARP",
    subType,
    layer2: {
      srcMac: senderMac,
      dstMac: BROADCAST_MAC,
      etherType: "0x0806",
    },
    layer3: {
      srcIp: senderIp,
      dstIp: targetIp,
      ttl: 1, // ARP não usa TTL, mas mantemos para consistência
      protocol: "ARP",
    },
    payload: {
      operation: "request",
      senderMac,
      senderIp,
      targetMac: "00:00:00:00:00:00",
      targetIp,
    } as ARPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId,
    destinationNodeId: "", // broadcast — sem destino único
    currentNodeId: sourceNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: true,
  };
}

/** Criar ARP Reply (unicast) */
export function createARPReply(
  senderMac: string,
  senderIp: string,
  targetMac: string,
  targetIp: string,
  sourceNodeId: string,
  destinationNodeId: string,
  currentTick: number,
): SimPacket {
  const subType: PacketSubType = "arp-reply";
  return {
    id: generatePacketId(subType),
    protocol: "ARP",
    subType,
    layer2: {
      srcMac: senderMac,
      dstMac: targetMac,
      etherType: "0x0806",
    },
    layer3: {
      srcIp: senderIp,
      dstIp: targetIp,
      ttl: 1,
      protocol: "ARP",
    },
    payload: {
      operation: "reply",
      senderMac,
      senderIp,
      targetMac,
      targetIp,
    } as ARPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId,
    destinationNodeId,
    currentNodeId: sourceNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ICMP PACKET FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

let icmpSequence = 0;
let icmpIdentifier = Math.floor(Math.random() * 65535);

/** Resetar contadores ICMP */
export function resetICMPCounters(): void {
  icmpSequence = 0;
  icmpIdentifier = Math.floor(Math.random() * 65535);
}

/** Criar ICMP Echo Request (Ping) */
export function createICMPEchoRequest(
  srcMac: string,
  dstMac: string,
  srcIp: string,
  dstIp: string,
  sourceNodeId: string,
  destinationNodeId: string,
  currentTick: number,
  ttl = 64,
): SimPacket {
  const subType: PacketSubType = "icmp-echo-request";
  return {
    id: generatePacketId(subType),
    protocol: "ICMP",
    subType,
    layer2: {
      srcMac,
      dstMac,
      etherType: "0x0800",
    },
    layer3: {
      srcIp,
      dstIp,
      ttl,
      protocol: "ICMP",
    },
    payload: {
      type: "echo-request",
      code: 0,
      sequence: ++icmpSequence,
      identifier: icmpIdentifier,
      data: "NetBuilder Academy Ping!",
    } as ICMPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId,
    destinationNodeId,
    currentNodeId: sourceNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: false,
  };
}

/** Criar ICMP Echo Reply (Pong) */
export function createICMPEchoReply(
  request: SimPacket,
  replierMac: string,
  replierIp: string,
  replierNodeId: string,
  dstMac: string,
  currentTick: number,
): SimPacket {
  const subType: PacketSubType = "icmp-echo-reply";
  const reqPayload = request.payload as ICMPPayload;

  return {
    id: generatePacketId(subType),
    protocol: "ICMP",
    subType,
    layer2: {
      srcMac: replierMac,
      dstMac,
      etherType: "0x0800",
    },
    layer3: {
      srcIp: replierIp,
      dstIp: request.layer3.srcIp,
      ttl: 64,
      protocol: "ICMP",
    },
    payload: {
      type: "echo-reply",
      code: 0,
      sequence: reqPayload.sequence,
      identifier: reqPayload.identifier,
      data: reqPayload.data,
    } as ICMPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId: replierNodeId,
    destinationNodeId: request.sourceNodeId,
    currentNodeId: replierNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: false,
  };
}

/** Criar ICMP Destination Unreachable */
export function createICMPUnreachable(
  originalPacket: SimPacket,
  senderMac: string,
  senderIp: string,
  senderNodeId: string,
  dstMac: string,
  currentTick: number,
): SimPacket {
  const subType: PacketSubType = "icmp-unreachable";
  return {
    id: generatePacketId(subType),
    protocol: "ICMP",
    subType,
    layer2: {
      srcMac: senderMac,
      dstMac,
      etherType: "0x0800",
    },
    layer3: {
      srcIp: senderIp,
      dstIp: originalPacket.layer3.srcIp,
      ttl: 64,
      protocol: "ICMP",
    },
    payload: {
      type: "unreachable",
      code: 1, // Host unreachable
      sequence: 0,
      identifier: 0,
    } as ICMPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId: senderNodeId,
    destinationNodeId: originalPacket.sourceNodeId,
    currentNodeId: senderNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: false,
  };
}

/** Criar ICMP TTL Exceeded */
export function createICMPTTLExceeded(
  originalPacket: SimPacket,
  senderMac: string,
  senderIp: string,
  senderNodeId: string,
  dstMac: string,
  currentTick: number,
): SimPacket {
  const subType: PacketSubType = "icmp-ttl-exceeded";
  return {
    id: generatePacketId(subType),
    protocol: "ICMP",
    subType,
    layer2: {
      srcMac: senderMac,
      dstMac,
      etherType: "0x0800",
    },
    layer3: {
      srcIp: senderIp,
      dstIp: originalPacket.layer3.srcIp,
      ttl: 64,
      protocol: "ICMP",
    },
    payload: {
      type: "ttl-exceeded",
      code: 0,
      sequence: 0,
      identifier: 0,
    } as ICMPPayload,
    visual: PACKET_VISUALS[subType],
    sourceNodeId: senderNodeId,
    destinationNodeId: originalPacket.sourceNodeId,
    currentNodeId: senderNodeId,
    ingressInterfaceId: null,
    createdAt: currentTick,
    hopCount: 0,
    isBroadcast: false,
  };
}
