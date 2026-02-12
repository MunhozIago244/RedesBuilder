// ─── Tipos Core do NetBuilder Academy ───────────────────────────────────────
// CAMADA DE REALISMO: Tipos estendidos para hardware real, portas físicas e CLI

import type { Node, Edge } from "reactflow";

// ─── Device Types ───────────────────────────────────────────────────────────

export type DeviceType =
  | "router"
  | "switch-l2"
  | "switch-l3"
  | "access-point"
  | "pc"
  | "laptop"
  | "ip-phone"
  | "server"
  | "printer"
  | "isp"
  | "cloud"
  | "firewall"
  | "smart-tv"
  | "smart-speaker"
  | "smart-light"
  | "security-camera"
  | "robot-vacuum"
  | "smart-thermostat"
  | "game-console"
  | "streaming-box";

export type DeviceCategory =
  | "networking"
  | "end-devices"
  | "cloud-wan"
  | "iot-smart-home";

export type LinkStatus = "up" | "down";
export type DeviceStatus = "online" | "offline";

// ─── Physical Interface Types ───────────────────────────────────────────────

export type InterfaceType = "rj45" | "sfp" | "wifi";
export type InterfaceSpeed = "10M" | "100M" | "1G" | "2.5G" | "10G";

/** Tipo de suporte PoE da interface */
export type PoEType = "in" | "out" | "none";

/** Mapeamento de compatibilidade de mídia entre tipos de interface */
export const MEDIA_COMPATIBILITY: Record<InterfaceType, InterfaceType[]> = {
  rj45: ["rj45"],
  sfp: ["sfp"],
  wifi: ["wifi"],
};

// ─── Hardware Model ─────────────────────────────────────────────────────────

export interface HardwareModel {
  /** ID único do modelo (ex: "cisco-2911") */
  modelId: string;
  /** Nome comercial (ex: "Cisco 2911") */
  modelName: string;
  /** Fabricante */
  vendor: string;
  /** Tipo de dispositivo base */
  deviceType: DeviceType;
  /** Categoria para a sidebar */
  category: DeviceCategory;
  /** Descrição educacional */
  description: string;
  /** Se suporta CLI (roteadores/switches) */
  hasCli: boolean;
  /** Firmware padrão (ex: "IOS 15.7") */
  firmware?: string;
  /** Blueprint das interfaces físicas */
  interfaceBlueprint: InterfaceBlueprint[];
  /** Dados padrão para criação do nó */
  defaultData: Partial<NetworkDeviceData>;
}

export interface InterfaceBlueprint {
  /** Prefixo de nomenclatura (ex: "GigabitEthernet") */
  namePrefix: string;
  /** Abreviação (ex: "Gi") */
  shortName: string;
  /** Tipo de mídia */
  type: InterfaceType;
  /** Velocidade da interface */
  speed: InterfaceSpeed;
  /** Quantidade de portas deste tipo */
  count: number;
  /** Numeração inicial (ex: "0/0" ou "1") */
  startIndex: string;
  /** Suporte PoE: 'in' (consome), 'out' (fornece) ou 'none' */
  poe?: PoEType;
  /** Grupo LACP (ex: "bond0") — interfaces no mesmo grupo agregam links */
  lacpGroup?: string;
  /** Rótulo de função da porta (ex: "Uplink", "PC", "LAN") */
  roleLabel?: string;
}

// ─── Device Data ────────────────────────────────────────────────────────────

export interface NetworkDeviceData {
  label: string;
  deviceType: DeviceType;
  /** Modelo de hardware (ex: "cisco-2911"). Undefined para dispositivos genéricos. */
  hardwareModel?: string;
  ipAddress: string;
  subnetMask: string;
  macAddress: string;
  gateway: string;
  status: DeviceStatus;
  linkStatus: LinkStatus;
  interfaces: NetworkInterface[];
}

export interface NetworkInterface {
  id: string;
  /** Nome IOS-like da interface (ex: "GigabitEthernet0/0") */
  name: string;
  /** Abreviação (ex: "Gi0/0") */
  shortName: string;
  /** Tipo de mídia física */
  type: InterfaceType;
  /** Velocidade */
  speed: InterfaceSpeed;
  /** Suporte PoE: 'in' (consome), 'out' (fornece) ou 'none' */
  poe: PoEType;
  /** Grupo LACP (ex: "bond0") */
  lacpGroup?: string;
  /** Rótulo de função (ex: "Uplink", "PC Port") */
  roleLabel?: string;
  /** Configuração IP (se atribuída) */
  ipConfig?: {
    address: string;
    mask: string;
  };
  /** Endereço MAC da interface */
  macAddress: string;
  /** ID da edge conectada, null se livre */
  connectedEdgeId: string | null;
  /** Admin status — interface habilitada/desabilitada */
  adminUp: boolean;
}

// ─── Packet Headers (Debug Mode) ────────────────────────────────────────────

export interface PacketHeader {
  layer2: {
    srcMac: string;
    dstMac: string;
    etherType: string;
  };
  layer3: {
    srcIp: string;
    dstIp: string;
    ttl: number;
    protocol: string;
  };
}

// ─── Simulation ─────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  path: string[];
  hops: number;
  latency: number;
  packets: PacketHeader[];
  errors: string[];
}

export interface PingState {
  source: string | null;
  target: string | null;
  isRunning: boolean;
  result: SimulationResult | null;
  animatingEdgeIndex: number;
  animatingEdges: string[];
}

// ─── Device Template (Sidebar) ──────────────────────────────────────────────

export interface DeviceTemplate {
  type: DeviceType;
  category: DeviceCategory;
  label: string;
  description: string;
  defaultData: Partial<NetworkDeviceData>;
}

// ─── Connection Validation Rules ────────────────────────────────────────────

export const VALID_CONNECTIONS: Record<DeviceType, DeviceType[]> = {
  router: [
    "switch-l2",
    "switch-l3",
    "router",
    "server",
    "isp",
    "cloud",
    "firewall",
  ],
  "switch-l2": [
    "router",
    "switch-l2",
    "switch-l3",
    "pc",
    "laptop",
    "server",
    "ip-phone",
    "printer",
    "access-point",
    "firewall",
    "smart-tv",
    "game-console",
    "streaming-box",
    "security-camera",
  ],
  "switch-l3": [
    "router",
    "switch-l2",
    "switch-l3",
    "pc",
    "laptop",
    "server",
    "ip-phone",
    "printer",
    "access-point",
    "firewall",
    "smart-tv",
    "game-console",
    "streaming-box",
    "security-camera",
  ],
  "access-point": [
    "switch-l2",
    "switch-l3",
    "laptop",
    "smart-tv",
    "smart-speaker",
    "smart-light",
    "security-camera",
    "robot-vacuum",
    "smart-thermostat",
    "game-console",
    "streaming-box",
  ],
  pc: ["switch-l2", "switch-l3"],
  laptop: ["switch-l2", "switch-l3", "access-point"],
  "ip-phone": ["switch-l2", "switch-l3"],
  server: ["switch-l2", "switch-l3", "router"],
  printer: ["switch-l2", "switch-l3"],
  isp: ["router", "cloud"],
  cloud: ["router", "isp"],
  firewall: ["router", "switch-l2", "switch-l3"],
  // ── IoT / Smart Home ──
  "smart-tv": ["switch-l2", "switch-l3", "access-point"],
  "smart-speaker": ["access-point"],
  "smart-light": ["access-point"],
  "security-camera": ["switch-l2", "switch-l3", "access-point"],
  "robot-vacuum": ["access-point"],
  "smart-thermostat": ["access-point"],
  "game-console": ["switch-l2", "switch-l3", "access-point"],
  "streaming-box": ["switch-l2", "switch-l3", "access-point"],
};

// ─── Connection Type Labels ─────────────────────────────────────────────────

export type ConnectionType = "ethernet" | "fiber" | "wireless" | "serial";

export function getConnectionType(
  sourceType: DeviceType,
  targetType: DeviceType,
): ConnectionType {
  if (sourceType === "access-point" || targetType === "access-point")
    return "wireless";
  if (sourceType === "isp" || targetType === "isp") return "fiber";
  if (sourceType === "cloud" || targetType === "cloud") return "fiber";
  return "ethernet";
}

// ─── History (Undo/Redo) ────────────────────────────────────────────────────

export interface HistoryEntry {
  nodes: Node<NetworkDeviceData>[];
  edges: Edge[];
}

// ─── Pending Connection (Port Selection Flow) ───────────────────────────────

export interface PendingConnection {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

// ─── CLI State ──────────────────────────────────────────────────────────────

export type CliMode = "user" | "privileged" | "config" | "config-if";

export interface CliState {
  hostname: string;
  mode: CliMode;
  currentInterface: string | null;
  history: string[];
  output: string[];
}

// ─── Store Interface ────────────────────────────────────────────────────────

export interface NetworkStore {
  // State
  nodes: Node<NetworkDeviceData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  simulationMode: boolean;
  debugMode: boolean;
  ping: PingState;
  history: HistoryEntry[];
  historyIndex: number;

  // Port Selection Flow
  pendingConnection: PendingConnection | null;
  showPortModal: boolean;

  // Direct setters (for templates / restore)
  setNodes: (nodes: Node<NetworkDeviceData>[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Node Actions
  addNode: (
    type: DeviceType,
    position: { x: number; y: number },
    modelId?: string,
  ) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NetworkDeviceData>) => void;
  selectNode: (id: string | null) => void;
  onNodesChange: (changes: import("reactflow").NodeChange[]) => void;

  // Edge Actions
  onEdgesChange: (changes: import("reactflow").EdgeChange[]) => void;
  onConnect: (connection: import("reactflow").Connection) => void;

  // Port Management
  setPendingConnection: (connection: PendingConnection | null) => void;
  setShowPortModal: (show: boolean) => void;
  connectPorts: (
    sourceNodeId: string,
    targetNodeId: string,
    sourceInterfaceId: string,
    targetInterfaceId: string,
  ) => void;
  disconnectPort: (nodeId: string, interfaceId: string) => void;

  // Mode Toggles
  toggleSimulation: () => void;
  toggleDebug: () => void;

  // Ping
  setPingSource: (id: string | null) => void;
  setPingTarget: (id: string | null) => void;
  runPing: () => Promise<void>;
  resetPing: () => void;

  // Layout
  autoLayout: () => void;

  // History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Canvas Actions
  clearCanvas: () => void;
}

// ─── Device Templates Catalog ───────────────────────────────────────────────

export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  // Networking
  {
    type: "router",
    category: "networking",
    label: "Roteador",
    description: "Encaminha pacotes entre redes diferentes (Layer 3)",
    defaultData: {
      ipAddress: "192.168.1.1",
      subnetMask: "255.255.255.0",
      gateway: "0.0.0.0",
    },
  },
  {
    type: "switch-l2",
    category: "networking",
    label: "Switch L2",
    description: "Comutação baseada em MAC Address (Layer 2)",
    defaultData: { ipAddress: "", subnetMask: "", gateway: "" },
  },
  {
    type: "switch-l3",
    category: "networking",
    label: "Switch L3",
    description: "Comutação com roteamento integrado (Layer 2/3)",
    defaultData: {
      ipAddress: "192.168.1.2",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "access-point",
    category: "networking",
    label: "Access Point",
    description: "Ponto de acesso Wi-Fi para dispositivos sem fio",
    defaultData: {
      ipAddress: "192.168.1.3",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "firewall",
    category: "networking",
    label: "Firewall",
    description: "Filtragem e controle de tráfego de rede",
    defaultData: {
      ipAddress: "192.168.1.254",
      subnetMask: "255.255.255.0",
      gateway: "0.0.0.0",
    },
  },
  // End Devices
  {
    type: "pc",
    category: "end-devices",
    label: "PC",
    description: "Computador Desktop com interface Ethernet",
    defaultData: {
      ipAddress: "192.168.1.10",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "laptop",
    category: "end-devices",
    label: "Laptop",
    description: "Notebook com Wi-Fi e Ethernet",
    defaultData: {
      ipAddress: "192.168.1.11",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "ip-phone",
    category: "end-devices",
    label: "Telefone IP",
    description: "Telefone VoIP com interface Ethernet",
    defaultData: {
      ipAddress: "192.168.1.20",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "server",
    category: "end-devices",
    label: "Servidor",
    description: "Servidor de rede para serviços e aplicações",
    defaultData: {
      ipAddress: "192.168.1.100",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "printer",
    category: "end-devices",
    label: "Impressora",
    description: "Impressora de rede com interface Ethernet",
    defaultData: {
      ipAddress: "192.168.1.50",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  // Cloud/WAN
  {
    type: "isp",
    category: "cloud-wan",
    label: "ISP",
    description: "Provedor de serviços de Internet",
    defaultData: {
      ipAddress: "10.0.0.1",
      subnetMask: "255.0.0.0",
      gateway: "0.0.0.0",
    },
  },
  {
    type: "cloud",
    category: "cloud-wan",
    label: "Nuvem Pública",
    description: "Serviço de nuvem pública (AWS, Azure, GCP)",
    defaultData: {
      ipAddress: "10.0.0.2",
      subnetMask: "255.0.0.0",
      gateway: "10.0.0.1",
    },
  },
  // IoT / Smart Home
  {
    type: "smart-tv",
    category: "iot-smart-home",
    label: "Smart TV",
    description: "TV conectada com streaming via Wi-Fi ou Ethernet",
    defaultData: {
      ipAddress: "192.168.1.60",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "smart-speaker",
    category: "iot-smart-home",
    label: "Assistente de Voz",
    description: "Alexa, Google Home ou HomePod — assistente residencial Wi-Fi",
    defaultData: {
      ipAddress: "192.168.1.61",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "smart-light",
    category: "iot-smart-home",
    label: "Luz Inteligente",
    description: "Lâmpada/fita LED Wi-Fi (Philips Hue, Yeelight, etc.)",
    defaultData: {
      ipAddress: "192.168.1.62",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "security-camera",
    category: "iot-smart-home",
    label: "Câmera de Segurança",
    description: "Câmera IP Wi-Fi/PoE para monitoramento residencial",
    defaultData: {
      ipAddress: "192.168.1.63",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "robot-vacuum",
    category: "iot-smart-home",
    label: "Robô Aspirador",
    description: "Aspirador robô conectado via Wi-Fi (Roomba, Roborock, etc.)",
    defaultData: {
      ipAddress: "192.168.1.64",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "smart-thermostat",
    category: "iot-smart-home",
    label: "Termostato Inteligente",
    description: "Controle de climatização Wi-Fi (Nest, Ecobee, etc.)",
    defaultData: {
      ipAddress: "192.168.1.65",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "game-console",
    category: "iot-smart-home",
    label: "Console de Jogos",
    description: "PlayStation, Xbox ou Nintendo Switch — Ethernet ou Wi-Fi",
    defaultData: {
      ipAddress: "192.168.1.66",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
  {
    type: "streaming-box",
    category: "iot-smart-home",
    label: "Streaming Box",
    description: "Chromecast, Apple TV, Fire Stick — streaming de mídia",
    defaultData: {
      ipAddress: "192.168.1.67",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    },
  },
];
