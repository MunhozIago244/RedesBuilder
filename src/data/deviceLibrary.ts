// ─── Device Library — Catálogo de Hardware ──────────────────────────────────
// Biblioteca extensível de dispositivos de rede com blueprints realistas.
// Para adicionar novos equipamentos, basta inserir uma nova entrada no array
// DEVICE_LIBRARY abaixo — todo o resto (node creation, port modal, etc.)
// se adapta automaticamente.
//
// PoE: 'in'  = interface consome PoE (ex: câmera, telefone IP)
//       'out' = interface fornece PoE (ex: porta de switch PoE)
//       'none' = sem suporte PoE

import type {
  HardwareModel,
  InterfaceBlueprint,
  NetworkInterface,
  DeviceType,
  PoEType,
} from "@/types/network";
import { generateMacAddress } from "@/utils/macGenerator";

// ─── Device Library Catalog ─────────────────────────────────────────────────

export const DEVICE_LIBRARY: HardwareModel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  //  NETWORKING — Equipamentos de infraestrutura
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Cisco Catalyst 2960 — Switch L2 PoE ────────────────────────────────
  {
    modelId: "cisco-catalyst-2960",
    modelName: "Cisco Catalyst 2960",
    vendor: "Cisco",
    deviceType: "switch-l2",
    category: "networking",
    description:
      "Switch L2 gerenciável com 24 portas FastEthernet PoE+ e 2 uplinks Gigabit. Ideal para distribuição em redes corporativas.",
    hasCli: true,
    firmware: "IOS 15.2(7)E",
    interfaceBlueprint: [
      {
        namePrefix: "FastEthernet",
        shortName: "Fa",
        type: "rj45",
        speed: "100M",
        count: 24,
        startIndex: "0/1",
        poe: "out",
      },
      {
        namePrefix: "GigabitEthernet",
        shortName: "Gi",
        type: "rj45",
        speed: "1G",
        count: 2,
        startIndex: "0/1",
        poe: "none",
        roleLabel: "Uplink",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.2",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── MikroTik hEX S — Roteador SOHO ────────────────────────────────────
  {
    modelId: "mikrotik-hex-s",
    modelName: "MikroTik hEX S",
    vendor: "MikroTik",
    deviceType: "router",
    category: "networking",
    description:
      "Roteador compacto com 5 portas GigabitEthernet + 1 SFP. RouterOS com firewall e QoS integrados.",
    hasCli: true,
    firmware: "RouterOS 7.x",
    interfaceBlueprint: [
      {
        namePrefix: "ether",
        shortName: "eth",
        type: "rj45",
        speed: "1G",
        count: 5,
        startIndex: "1",
        poe: "none",
      },
      {
        namePrefix: "sfp",
        shortName: "sfp",
        type: "sfp",
        speed: "1G",
        count: 1,
        startIndex: "1",
        poe: "none",
        roleLabel: "Uplink SFP",
      },
    ],
    defaultData: {
      ipAddress: "192.168.88.1",
      subnetMask: "255.255.255.0",
      gateway: "0.0.0.0",
    },
  },

  // ── Cisco 2911 — Roteador Corporativo ──────────────────────────────────
  {
    modelId: "cisco-2911",
    modelName: "Cisco 2911",
    vendor: "Cisco",
    deviceType: "router",
    category: "networking",
    description:
      "Roteador modular ISR G2 com 3 portas GE, suporte a VPN, voz e segurança.",
    hasCli: true,
    firmware: "IOS 15.7(3)M",
    interfaceBlueprint: [
      {
        namePrefix: "GigabitEthernet",
        shortName: "Gi",
        type: "rj45",
        speed: "1G",
        count: 3,
        startIndex: "0/0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.1",
      subnetMask: "255.255.255.0",
      gateway: "0.0.0.0",
    },
  },

  // ── Ubiquiti UniFi AP-AC-Pro — Access Point ────────────────────────────
  {
    modelId: "ubiquiti-ap-ac-pro",
    modelName: "Ubiquiti AP-AC-Pro",
    vendor: "Ubiquiti",
    deviceType: "access-point",
    category: "networking",
    description:
      "Access Point 802.11ac Wave 2 com 1 porta GE PoE. Gerenciamento via UniFi Controller.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "eth",
        shortName: "eth",
        type: "rj45",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "in",
      },
      {
        namePrefix: "wlan",
        shortName: "wlan",
        type: "wifi",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.3",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Switch L3 Genérico ─────────────────────────────────────────────────
  {
    modelId: "generic-switch-l3",
    modelName: "Switch L3",
    vendor: "Generic",
    deviceType: "switch-l3",
    category: "networking",
    description: "Switch gerenciável Layer 3 com roteamento integrado.",
    hasCli: true,
    interfaceBlueprint: [
      {
        namePrefix: "GigabitEthernet",
        shortName: "Gi",
        type: "rj45",
        speed: "1G",
        count: 12,
        startIndex: "0/1",
        poe: "none",
      },
      {
        namePrefix: "TenGigabitEthernet",
        shortName: "Te",
        type: "sfp",
        speed: "10G",
        count: 2,
        startIndex: "0/1",
        poe: "none",
        roleLabel: "Uplink",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.2",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Firewall Genérico ──────────────────────────────────────────────────
  {
    modelId: "generic-firewall",
    modelName: "Firewall",
    vendor: "Generic",
    deviceType: "firewall",
    category: "networking",
    description: "Firewall de rede com interfaces WAN e LAN.",
    hasCli: true,
    interfaceBlueprint: [
      {
        namePrefix: "GigabitEthernet",
        shortName: "Gi",
        type: "rj45",
        speed: "1G",
        count: 4,
        startIndex: "0/0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.254",
      subnetMask: "255.255.255.0",
      gateway: "0.0.0.0",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  END DEVICES — Dispositivos finais
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Dell PowerEdge Server — 4x GE LACP ────────────────────────────────
  {
    modelId: "dell-poweredge-server",
    modelName: "Dell PowerEdge R640",
    vendor: "Dell",
    deviceType: "server",
    category: "end-devices",
    description:
      "Servidor rack 1U com 4 NICs GigabitEthernet em LACP bond (bond0) para alta disponibilidade e throughput agregado.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "1G",
        count: 4,
        startIndex: "0",
        poe: "none",
        lacpGroup: "bond0",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.100",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── PC Workstation — 1x 2.5G Ethernet ─────────────────────────────────
  {
    modelId: "pc-workstation",
    modelName: "PC Workstation",
    vendor: "Generic",
    deviceType: "pc",
    category: "end-devices",
    description:
      "Estação de trabalho com 1 NIC Ethernet 2.5G Realtek RTL8125. Conexão direta ao switch de acesso.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "2.5G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.10",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Cisco IP Phone 7841 — 2x Ethernet Bridge ──────────────────────────
  {
    modelId: "cisco-ip-phone-7841",
    modelName: "Cisco IP Phone 7841",
    vendor: "Cisco",
    deviceType: "ip-phone",
    category: "end-devices",
    description:
      "Telefone IP com 2 portas Ethernet (SW e PC): SW recebe o cabo do switch PoE, PC conecta o computador em cascata.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet-SW",
        shortName: "SW",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "in",
        roleLabel: "LAN (Switch)",
      },
      {
        namePrefix: "Ethernet-PC",
        shortName: "PC",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
        roleLabel: "PC Port",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.20",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── IP Camera Dome — 1x Ethernet PoE Required ─────────────────────────
  {
    modelId: "ip-camera-dome",
    modelName: "IP Camera Dome",
    vendor: "Generic",
    deviceType: "printer", // reutiliza tipo 'printer' como genérico IoT endpoint
    category: "end-devices",
    description:
      "Câmera IP Dome com alimentação via PoE (802.3af). Requer porta PoE no switch para operar.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "in",
        roleLabel: "PoE Required",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.30",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Laptop Genérico ────────────────────────────────────────────────────
  {
    modelId: "generic-laptop",
    modelName: "Laptop",
    vendor: "Generic",
    deviceType: "laptop",
    category: "end-devices",
    description: "Notebook com Wi-Fi e Ethernet integrados.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.11",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Impressora de Rede ─────────────────────────────────────────────────
  {
    modelId: "generic-printer",
    modelName: "Impressora",
    vendor: "Generic",
    deviceType: "printer",
    category: "end-devices",
    description: "Impressora de rede com interface Ethernet.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.50",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLOUD / WAN
  // ═══════════════════════════════════════════════════════════════════════════

  // ── ISP ────────────────────────────────────────────────────────────────
  {
    modelId: "generic-isp",
    modelName: "ISP",
    vendor: "Generic",
    deviceType: "isp",
    category: "cloud-wan",
    description: "Provedor de serviços de Internet.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Fiber",
        shortName: "Fb",
        type: "sfp",
        speed: "10G",
        count: 2,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "10.0.0.1",
      subnetMask: "255.0.0.0",
      gateway: "0.0.0.0",
    },
  },

  // ── Cloud ──────────────────────────────────────────────────────────────
  {
    modelId: "generic-cloud",
    modelName: "Nuvem Pública",
    vendor: "Generic",
    deviceType: "cloud",
    category: "cloud-wan",
    description: "Serviço de nuvem pública (AWS, Azure, GCP).",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "VirtualNIC",
        shortName: "vNIC",
        type: "sfp",
        speed: "10G",
        count: 2,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "10.0.0.2",
      subnetMask: "255.0.0.0",
      gateway: "10.0.0.1",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  IoT / SMART HOME — Dispositivos residenciais inteligentes
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Smart TV ───────────────────────────────────────────────────────────
  {
    modelId: "generic-smart-tv",
    modelName: "Smart TV 4K",
    vendor: "Generic",
    deviceType: "smart-tv",
    category: "iot-smart-home",
    description:
      "TV conectada com Wi-Fi e Ethernet para streaming 4K (Netflix, YouTube, etc.).",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.60",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Smart Speaker / Assistente de Voz ──────────────────────────────────
  {
    modelId: "generic-smart-speaker",
    modelName: "Assistente de Voz",
    vendor: "Generic",
    deviceType: "smart-speaker",
    category: "iot-smart-home",
    description:
      "Alexa, Google Home ou HomePod — assistente residencial Wi-Fi.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.61",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Luz Inteligente ────────────────────────────────────────────────────
  {
    modelId: "generic-smart-light",
    modelName: "Luz Inteligente",
    vendor: "Generic",
    deviceType: "smart-light",
    category: "iot-smart-home",
    description: "Lâmpada/fita LED Wi-Fi. Tráfego mínimo (~0.1 Mbps).",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.62",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Câmera de Segurança ────────────────────────────────────────────────
  {
    modelId: "generic-security-camera",
    modelName: "Câmera IP",
    vendor: "Generic",
    deviceType: "security-camera",
    category: "iot-smart-home",
    description:
      "Câmera IP Wi-Fi ou PoE para monitoramento. Streaming contínuo ~8-15 Mbps.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "in",
        roleLabel: "PoE",
      },
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.63",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Robô Aspirador ────────────────────────────────────────────────────
  {
    modelId: "generic-robot-vacuum",
    modelName: "Robô Aspirador",
    vendor: "Generic",
    deviceType: "robot-vacuum",
    category: "iot-smart-home",
    description:
      "Aspirador robô conectado via Wi-Fi. Tráfego baixo (~2 Mbps para mapeamento).",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.64",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Termostato Inteligente ─────────────────────────────────────────────
  {
    modelId: "generic-smart-thermostat",
    modelName: "Termostato Smart",
    vendor: "Generic",
    deviceType: "smart-thermostat",
    category: "iot-smart-home",
    description: "Controle de climatização Wi-Fi. Tráfego mínimo (~0.5 Mbps).",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.65",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Console de Jogos ──────────────────────────────────────────────────
  {
    modelId: "generic-game-console",
    modelName: "Console de Jogos",
    vendor: "Generic",
    deviceType: "game-console",
    category: "iot-smart-home",
    description:
      "PlayStation, Xbox ou Switch. Alto consumo: download de jogos e streaming ~75 Mbps.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.66",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },

  // ── Streaming Box ─────────────────────────────────────────────────────
  {
    modelId: "generic-streaming-box",
    modelName: "Streaming Box",
    vendor: "Generic",
    deviceType: "streaming-box",
    category: "iot-smart-home",
    description: "Chromecast, Apple TV, Fire Stick. Streaming 4K ~25-30 Mbps.",
    hasCli: false,
    interfaceBlueprint: [
      {
        namePrefix: "Ethernet",
        shortName: "Eth",
        type: "rj45",
        speed: "100M",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
      {
        namePrefix: "Wi-Fi",
        shortName: "Wi-Fi",
        type: "wifi",
        speed: "1G",
        count: 1,
        startIndex: "0",
        poe: "none",
      },
    ],
    defaultData: {
      ipAddress: "192.168.1.67",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
];

// ─── Factory Functions ──────────────────────────────────────────────────────

/**
 * Gera a numeração de interface baseado no padrão (IOS "0/0", "0/1" ou simples "1", "2")
 */
function generateInterfaceIndex(startIndex: string, offset: number): string {
  if (startIndex.includes("/")) {
    const parts = startIndex.split("/");
    const slot = parts[0];
    const port = parseInt(parts[1], 10) + offset;
    return `${slot}/${port}`;
  }
  return String(parseInt(startIndex, 10) + offset);
}

/**
 * Factory que gera interfaces concretas a partir do blueprint de hardware.
 * Cada blueprint gera N interfaces com nomes numerados, MAC único e PoE tipado.
 */
export function createInterfacesFromBlueprint(
  blueprints: InterfaceBlueprint[],
  deviceType: string,
): NetworkInterface[] {
  const interfaces: NetworkInterface[] = [];

  for (const bp of blueprints) {
    for (let i = 0; i < bp.count; i++) {
      const index = generateInterfaceIndex(bp.startIndex, i);
      const fullName = `${bp.namePrefix}${index}`;
      const shortName = `${bp.shortName}${index}`;

      interfaces.push({
        id: `${bp.shortName.toLowerCase()}${index.replace("/", "-")}`,
        name: fullName,
        shortName,
        type: bp.type,
        speed: bp.speed,
        poe: bp.poe ?? "none",
        lacpGroup: bp.lacpGroup,
        roleLabel: bp.roleLabel,
        macAddress: generateMacAddress(deviceType),
        connectedEdgeId: null,
        adminUp: true,
      });
    }
  }

  return interfaces;
}

/**
 * Busca um modelo de hardware pelo ID.
 */
export function getHardwareModel(modelId: string): HardwareModel | undefined {
  return DEVICE_LIBRARY.find((m) => m.modelId === modelId);
}

/**
 * Busca o modelo padrão para um tipo de dispositivo.
 */
export function getDefaultModelForType(
  deviceType: DeviceType,
): HardwareModel | undefined {
  return DEVICE_LIBRARY.find((m) => m.deviceType === deviceType);
}

/**
 * Retorna todos os modelos disponíveis para um tipo de dispositivo.
 */
export function getModelsForType(deviceType: DeviceType): HardwareModel[] {
  return DEVICE_LIBRARY.filter((m) => m.deviceType === deviceType);
}

/**
 * Verifica se uma conexão tem alerta de PoE:
 * Se a interface source fornece PoE 'out' e a target requer 'in', ok.
 * Se target requer 'in' mas source não fornece 'out', alerta.
 */
export function checkPoECompatibility(
  sourceIface: NetworkInterface,
  targetIface: NetworkInterface,
): { ok: boolean; warning?: string } {
  if (targetIface.poe === "in" && sourceIface.poe !== "out") {
    return {
      ok: false,
      warning: `${targetIface.shortName} requer PoE, mas ${sourceIface.shortName} não fornece PoE.`,
    };
  }
  if (sourceIface.poe === "in" && targetIface.poe !== "out") {
    return {
      ok: false,
      warning: `${sourceIface.shortName} requer PoE, mas ${targetIface.shortName} não fornece PoE.`,
    };
  }
  return { ok: true };
}
