// ─── Validation Engine ──────────────────────────────────────────────────────
// Valida conexões entre dispositivos e configurações de rede.

import type { Node } from "reactflow";
import type { DeviceType, NetworkDeviceData } from "@/types/network";
import { VALID_CONNECTIONS } from "@/types/network";
import { isValidIp, isValidSubnetMask, isSameSubnet } from "@/utils/ipUtils";

type NetworkNode = Node<NetworkDeviceData>;

// ─── Connection Validation ──────────────────────────────────────────────────

export interface ConnectionValidation {
  valid: boolean;
  reason: string;
}

/**
 * Valida se uma conexão entre dois dispositivos é permitida pela topologia.
 */
export function validateConnection(
  sourceNode: NetworkNode | undefined,
  targetNode: NetworkNode | undefined,
): ConnectionValidation {
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: "Dispositivo não encontrado" };
  }

  if (sourceNode.id === targetNode.id) {
    return {
      valid: false,
      reason: "Não é possível conectar um dispositivo a si mesmo",
    };
  }

  const sourceType: DeviceType = sourceNode.data.deviceType;
  const targetType: DeviceType = targetNode.data.deviceType;

  const allowedTargets = VALID_CONNECTIONS[sourceType];
  if (!allowedTargets) {
    return {
      valid: false,
      reason: `Tipo de dispositivo desconhecido: ${sourceType}`,
    };
  }

  if (!allowedTargets.includes(targetType)) {
    return {
      valid: false,
      reason: `${getDeviceLabel(sourceType)} não pode se conectar diretamente a ${getDeviceLabel(targetType)}`,
    };
  }

  return { valid: true, reason: "Conexão válida" };
}

/**
 * Verifica se uma conexão já existe entre dois nós.
 * No modo port-based (com interfaces físicas), permite múltiplas conexões
 * entre os mesmos nós em portas diferentes.
 */
export function isDuplicateConnection(
  edges: {
    source: string;
    target: string;
    data?: { sourceInterface?: string; targetInterface?: string };
  }[],
  source: string,
  target: string,
  sourceInterfaceId?: string,
  targetInterfaceId?: string,
): boolean {
  return edges.some((e) => {
    const sameNodes =
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source);

    if (!sameNodes) return false;

    // Se não foram fornecidos IDs de interface, verificar apenas por nós
    // (modo legado sem portas físicas)
    if (!sourceInterfaceId || !targetInterfaceId) {
      // Se a edge existente também não tem portas, é duplicata
      if (!e.data?.sourceInterface && !e.data?.targetInterface) return true;
      // Se a edge existente tem portas, permitir pois será outra porta
      return false;
    }

    // Modo port-based: duplicata apenas se MESMAS portas
    const edgeSrc = e.data?.sourceInterface;
    const edgeTgt = e.data?.targetInterface;
    return (
      (edgeSrc === sourceInterfaceId && edgeTgt === targetInterfaceId) ||
      (edgeSrc === targetInterfaceId && edgeTgt === sourceInterfaceId)
    );
  });
}

// ─── IP Configuration Validation ────────────────────────────────────────────

export interface IpValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Valida a configuração IP de um dispositivo.
 */
export function validateDeviceIpConfig(data: NetworkDeviceData): IpValidation {
  const errors: string[] = [];

  // Switches L2 não precisam de IP
  if (data.deviceType === "switch-l2") {
    return { valid: true, errors: [] };
  }

  if (data.ipAddress && !isValidIp(data.ipAddress)) {
    errors.push("Endereço IP inválido");
  }

  if (data.subnetMask && !isValidSubnetMask(data.subnetMask)) {
    errors.push("Máscara de sub-rede inválida");
  }

  if (data.gateway && data.gateway !== "0.0.0.0" && !isValidIp(data.gateway)) {
    errors.push("Gateway inválido");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida se dois dispositivos conectados estão na mesma sub-rede (camada 3).
 */
export function validateSubnetReachability(
  sourceData: NetworkDeviceData,
  targetData: NetworkDeviceData,
): ConnectionValidation {
  // Skip para switches L2 — operam em Layer 2
  if (
    sourceData.deviceType === "switch-l2" ||
    targetData.deviceType === "switch-l2"
  ) {
    return { valid: true, reason: "Switch L2 opera em Layer 2" };
  }

  if (!sourceData.ipAddress || !targetData.ipAddress) {
    return { valid: true, reason: "IP não configurado — validação ignorada" };
  }

  if (!sourceData.subnetMask || !targetData.subnetMask) {
    return {
      valid: true,
      reason: "Máscara não configurada — validação ignorada",
    };
  }

  const sameSubnet = isSameSubnet(
    sourceData.ipAddress,
    sourceData.subnetMask,
    targetData.ipAddress,
    targetData.subnetMask,
  );

  // Entre roteadores, sub-redes diferentes são esperadas
  if (
    sourceData.deviceType === "router" &&
    targetData.deviceType === "router"
  ) {
    return { valid: true, reason: "Roteadores conectam redes diferentes" };
  }

  if (!sameSubnet) {
    return {
      valid: false,
      reason: `Dispositivos em sub-redes diferentes: ${sourceData.ipAddress}/${sourceData.subnetMask} ↔ ${targetData.ipAddress}/${targetData.subnetMask}`,
    };
  }

  return { valid: true, reason: "Mesma sub-rede" };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDeviceLabel(type: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    router: "Roteador",
    "switch-l2": "Switch L2",
    "switch-l3": "Switch L3",
    "access-point": "Access Point",
    pc: "PC",
    laptop: "Laptop",
    "ip-phone": "Telefone IP",
    server: "Servidor",
    printer: "Impressora",
    isp: "ISP",
    cloud: "Nuvem",
    firewall: "Firewall",
    "smart-tv": "Smart TV",
    "smart-speaker": "Assistente de Voz",
    "smart-light": "Luz Inteligente",
    "security-camera": "Câmera IP",
    "robot-vacuum": "Robô Aspirador",
    "smart-thermostat": "Termostato",
    "game-console": "Console de Jogos",
    "streaming-box": "Streaming Box",
  };
  return labels[type] ?? type;
}
