// ─── Simulation Engine Types ────────────────────────────────────────────────
// Tipos do motor de simulação: Pacotes, Tabelas, Eventos, Estado de Dispositivos.
// Segue modelo OSI simplificado para fins pedagógicos.

// ═══════════════════════════════════════════════════════════════════════════
// PACKET TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de protocolo suportados pela engine */
export type ProtocolType = "ARP" | "ICMP" | "IP";

/** Subtipo de pacote para identificação visual */
export type PacketSubType =
  | "arp-request"
  | "arp-reply"
  | "icmp-echo-request"
  | "icmp-echo-reply"
  | "icmp-unreachable"
  | "icmp-ttl-exceeded";

/** Metadados visuais para renderização do pacote no canvas */
export interface PacketVisualMeta {
  /** Cor principal do pacote no canvas */
  color: string;
  /** Cor secundária (borda / glow) */
  secondaryColor: string;
  /** Nome do ícone Lucide (ex: "radio", "send") */
  icon: string;
  /** Label curta exibida ao lado do "envelope" */
  label: string;
  /** Texto para screen readers */
  ariaLabel: string;
  /** Padrão CSS para daltonismo (usa ícone + cor) */
  pattern: "solid" | "striped" | "dotted";
}

/** Header Layer 2 (Ethernet) */
export interface L2Header {
  srcMac: string;
  dstMac: string;
  /** EtherType: 0x0806 = ARP, 0x0800 = IPv4 */
  etherType: "0x0806" | "0x0800";
}

/** Header Layer 3 (IP / ARP payload) */
export interface L3Header {
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: ProtocolType;
}

/** Payload ARP */
export interface ARPPayload {
  operation: "request" | "reply";
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}

/** Payload ICMP */
export interface ICMPPayload {
  type: "echo-request" | "echo-reply" | "unreachable" | "ttl-exceeded";
  code: number;
  sequence: number;
  identifier: number;
  data?: string;
}

/** Entidade Packet — unidade fundamental do tráfego simulado */
export interface SimPacket {
  /** UUID do pacote para tracking/animação */
  id: string;
  /** Tipo de protocolo principal */
  protocol: ProtocolType;
  /** Subtipo para diferenciação visual */
  subType: PacketSubType;
  /** Header Layer 2 */
  layer2: L2Header;
  /** Header Layer 3 */
  layer3: L3Header;
  /** Payload específico do protocolo */
  payload: ARPPayload | ICMPPayload;
  /** Metadados visuais para renderização */
  visual: PacketVisualMeta;
  /** ID do nó onde o pacote foi criado */
  sourceNodeId: string;
  /** ID do nó de destino final */
  destinationNodeId: string;
  /** ID do nó onde o pacote está agora */
  currentNodeId: string;
  /** ID da interface de entrada (null se origem) */
  ingressInterfaceId: string | null;
  /** Timestamp de criação (tick do scheduler) */
  createdAt: number;
  /** Contador de hops percorridos */
  hopCount: number;
  /** Se é broadcast (FF:FF:FF:FF:FF:FF) */
  isBroadcast: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE STATE TABLES
// ═══════════════════════════════════════════════════════════════════════════

/** Entrada na Tabela ARP */
export interface ARPEntry {
  ipAddress: string;
  macAddress: string;
  /** Interface por onde aprendeu */
  interfaceId: string;
  /** Tick em que foi aprendido */
  learnedAt: number;
  /** Timeout em ticks (padrão: 300 = ~5 min simulados) */
  timeout: number;
  /** Se foi configurado manualmente (não expira) */
  isStatic: boolean;
}

/** Entrada na CAM Table (Switch) */
export interface CAMEntry {
  macAddress: string;
  /** ID da interface/porta do switch */
  interfaceId: string;
  /** Tick em que foi aprendido */
  learnedAt: number;
  /** Timeout de aging (padrão: 300) */
  agingTime: number;
}

/** Rota na Tabela de Roteamento */
export interface RouteEntry {
  /** Rede de destino (ex: "192.168.1.0") */
  network: string;
  /** Máscara de sub-rede (ex: "255.255.255.0") */
  mask: string;
  /** Prefixo CIDR para ordenação (ex: 24) */
  prefixLength: number;
  /** Next hop IP ou null se diretamente conectada */
  nextHop: string | null;
  /** Interface de saída */
  outInterface: string;
  /** Tipo da rota */
  type: "connected" | "static";
  /** Distância administrativa */
  adminDistance: number;
  /** Métrica */
  metric: number;
}

/** Estado persistente de um dispositivo na simulação */
export interface DeviceSimState {
  deviceId: string;
  /** Tabela ARP (todos os dispositivos L3) */
  arpTable: ARPEntry[];
  /** Tabela CAM (apenas switches) */
  camTable: CAMEntry[];
  /** Tabela de rotas (roteadores e dispositivos L3) */
  routingTable: RouteEntry[];
  /** Running config (objeto JSON serializado) */
  runningConfig: Record<string, unknown>;
  /** Startup config (salva explicitamente) */
  startupConfig: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION EVENTS (Event Bus)
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de evento emitidos pela engine */
export type SimEventType =
  // Lifecycle de pacote
  | "packet:created"
  | "packet:move"
  | "packet:arrive"
  | "packet:drop"
  | "packet:inspect"
  // Mudanças de tabela
  | "table:arp-update"
  | "table:cam-update"
  | "table:route-update"
  // Estado da simulação
  | "sim:tick"
  | "sim:start"
  | "sim:pause"
  | "sim:reset"
  | "sim:complete"
  | "sim:speed-change"
  // Interface/porta
  | "port:status-change"
  // Acessibilidade
  | "announce"
  // Log de console
  | "console:log"
  | "console:error"
  | "console:warn";

/** Razão de descarte de pacote */
export type DropReason =
  | "no-route"
  | "ttl-expired"
  | "port-down"
  | "no-arp-reply"
  | "unreachable"
  | "no-interface"
  | "loop-detected"
  | "no-ip-config";

/** Evento de movimentação de pacote (usado para animação) */
export interface PacketMoveEvent {
  packet: SimPacket;
  fromNodeId: string;
  toNodeId: string;
  edgeId: string;
  /** Duração da animação em ms (baseada na latência configurada) */
  animationDurationMs: number;
}

/** Evento de descarte de pacote */
export interface PacketDropEvent {
  packet: SimPacket;
  atNodeId: string;
  reason: DropReason;
  /** Mensagem explicativa para o console pedagógico */
  explanation: string;
  /** Texto para screen reader */
  ariaAnnouncement: string;
}

/** Evento de chegada de pacote */
export interface PacketArriveEvent {
  packet: SimPacket;
  atNodeId: string;
  /** Mensagem de sucesso */
  explanation: string;
  ariaAnnouncement: string;
}

/** Evento de atualização de tabela */
export interface TableUpdateEvent {
  deviceId: string;
  tableType: "arp" | "cam" | "route";
  action: "add" | "remove" | "update" | "timeout";
  entry: ARPEntry | CAMEntry | RouteEntry;
  explanation: string;
}

/** Evento de log do console */
export interface ConsoleLogEvent {
  level: "info" | "warn" | "error" | "success";
  timestamp: number;
  source: string;
  message: string;
  /** Detalhes técnicos (expandíveis) */
  details?: string;
}

/** Mapa de tipos de evento para seus payloads */
export interface SimEventMap {
  "packet:created": { packet: SimPacket };
  "packet:move": PacketMoveEvent;
  "packet:arrive": PacketArriveEvent;
  "packet:drop": PacketDropEvent;
  "packet:inspect": { packet: SimPacket };
  "table:arp-update": TableUpdateEvent;
  "table:cam-update": TableUpdateEvent;
  "table:route-update": TableUpdateEvent;
  "sim:tick": { tick: number };
  "sim:start": { mode: string };
  "sim:pause": Record<string, never>;
  "sim:reset": Record<string, never>;
  "sim:complete": SimulationSummary;
  "sim:speed-change": { speed: SimulationSpeed };
  "port:status-change": { nodeId: string; interfaceId: string; up: boolean };
  announce: { message: string; priority: "polite" | "assertive" };
  "console:log": ConsoleLogEvent;
  "console:error": ConsoleLogEvent;
  "console:warn": ConsoleLogEvent;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION CONTROL
// ═══════════════════════════════════════════════════════════════════════════

/** Velocidade da simulação */
export type SimulationSpeed = "slow" | "normal" | "fast" | "instant";

/** Configuração do scheduler */
export interface SchedulerConfig {
  /** Latência base por hop em ms */
  baseLatencyMs: number;
  /** Velocidade da simulação */
  speed: SimulationSpeed;
  /** Intervalo do tick em ms */
  tickIntervalMs: number;
  /** TTL padrão */
  defaultTTL: number;
  /** Timeout ARP em ticks */
  arpTimeout: number;
  /** Aging time CAM em ticks */
  camAgingTime: number;
}

/** Mapeamento de velocidade para multiplicador de tempo */
export const SPEED_MULTIPLIERS: Record<SimulationSpeed, number> = {
  slow: 3.0,
  normal: 1.0,
  fast: 0.3,
  instant: 0.01,
};

/** Configuração padrão do scheduler */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  baseLatencyMs: 800,
  speed: "normal",
  tickIntervalMs: 100,
  defaultTTL: 64,
  arpTimeout: 300,
  camAgingTime: 300,
};

/** Evento agendado na fila do scheduler */
export interface ScheduledEvent {
  /** ID único do evento */
  id: string;
  /** Tick em que deve ser processado */
  scheduledTick: number;
  /** Tipo do evento */
  type: "packet-forward" | "arp-timeout" | "cam-aging" | "sim-complete";
  /** Pacote associado (se aplicável) */
  packet?: SimPacket;
  /** Dados adicionais */
  data?: Record<string, unknown>;
}

/** Resumo da simulação ao final */
export interface SimulationSummary {
  /** Sucesso geral */
  success: boolean;
  /** Tempo total de simulação em ticks */
  totalTicks: number;
  /** Total de pacotes criados */
  totalPackets: number;
  /** Total de pacotes entregues */
  deliveredPackets: number;
  /** Total de pacotes descartados */
  droppedPackets: number;
  /** Caminho percorrido (IDs dos nós) */
  path: string[];
  /** Latência total simulada em ms */
  totalLatencyMs: number;
  /** Logs gerados */
  logs: ConsoleLogEvent[];
  /** Erros encontrados */
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL PRESETS (Cores e ícones por tipo de pacote)
// ═══════════════════════════════════════════════════════════════════════════

/** Preset visual por subtipo de pacote — acessível para daltonismo */
export const PACKET_VISUALS: Record<PacketSubType, PacketVisualMeta> = {
  "arp-request": {
    color: "#f59e0b", // Amber
    secondaryColor: "#fbbf24",
    icon: "radio",
    label: "ARP Req",
    ariaLabel: "Pacote ARP Request (broadcast)",
    pattern: "striped",
  },
  "arp-reply": {
    color: "#eab308", // Yellow
    secondaryColor: "#facc15",
    icon: "reply",
    label: "ARP Reply",
    ariaLabel: "Pacote ARP Reply (unicast)",
    pattern: "dotted",
  },
  "icmp-echo-request": {
    color: "#3b82f6", // Blue
    secondaryColor: "#60a5fa",
    icon: "send",
    label: "Ping",
    ariaLabel: "Pacote ICMP Echo Request",
    pattern: "solid",
  },
  "icmp-echo-reply": {
    color: "#22c55e", // Green
    secondaryColor: "#4ade80",
    icon: "check-circle",
    label: "Pong",
    ariaLabel: "Pacote ICMP Echo Reply",
    pattern: "solid",
  },
  "icmp-unreachable": {
    color: "#ef4444", // Red
    secondaryColor: "#f87171",
    icon: "x-circle",
    label: "Unreachable",
    ariaLabel: "Pacote ICMP Destination Unreachable",
    pattern: "striped",
  },
  "icmp-ttl-exceeded": {
    color: "#f97316", // Orange
    secondaryColor: "#fb923c",
    icon: "clock",
    label: "TTL Expired",
    ariaLabel: "Pacote ICMP TTL Exceeded",
    pattern: "dotted",
  },
};

/** MAC de broadcast Ethernet */
export const BROADCAST_MAC = "FF:FF:FF:FF:FF:FF";

/** IP de broadcast */
export const BROADCAST_IP = "255.255.255.255";
