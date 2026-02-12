// ─── Device State Manager ───────────────────────────────────────────────────
// Gerencia o estado persistente de cada dispositivo na simulação.
// Inclui: ARP Table, CAM Table, Routing Table, VFS (running/startup config).

import type {
  ARPEntry,
  CAMEntry,
  RouteEntry,
  DeviceSimState,
  TableUpdateEvent,
} from "@/types/simulation";
import type { DeviceType, NetworkInterface } from "@/types/network";
import { SimEventBus } from "./eventBus";
import { ipToNumber, getNetworkAddress, isValidIp } from "@/utils/ipUtils";

// ═══════════════════════════════════════════════════════════════════════════
// ARP TABLE
// ═══════════════════════════════════════════════════════════════════════════

export class ARPTable {
  private entries = new Map<string, ARPEntry>();
  private eventBus: SimEventBus;
  private deviceId: string;

  constructor(deviceId: string, eventBus: SimEventBus) {
    this.deviceId = deviceId;
    this.eventBus = eventBus;
  }

  /** Buscar MAC pelo IP */
  lookup(ip: string): ARPEntry | null {
    return this.entries.get(ip) ?? null;
  }

  /** Adicionar/atualizar entrada */
  add(
    ip: string,
    mac: string,
    interfaceId: string,
    currentTick: number,
    isStatic = false,
  ): void {
    const existing = this.entries.get(ip);
    const entry: ARPEntry = {
      ipAddress: ip,
      macAddress: mac,
      interfaceId,
      learnedAt: currentTick,
      timeout: 300, // ~5 min simulados
      isStatic,
    };

    this.entries.set(ip, entry);

    this.eventBus.emit("table:arp-update", {
      deviceId: this.deviceId,
      tableType: "arp",
      action: existing ? "update" : "add",
      entry,
      explanation: existing
        ? `ARP: Atualizado ${ip} → ${mac} na tabela do dispositivo`
        : `ARP: Aprendido ${ip} → ${mac} via interface`,
    });
  }

  /** Remover entrada */
  remove(ip: string): boolean {
    const entry = this.entries.get(ip);
    if (!entry) return false;

    this.entries.delete(ip);
    this.eventBus.emit("table:arp-update", {
      deviceId: this.deviceId,
      tableType: "arp",
      action: "remove",
      entry,
      explanation: `ARP: Removido ${ip} da tabela`,
    });
    return true;
  }

  /** Processar aging — remover entradas expiradas */
  age(currentTick: number): void {
    for (const [ip, entry] of this.entries) {
      if (!entry.isStatic && currentTick - entry.learnedAt > entry.timeout) {
        this.entries.delete(ip);
        this.eventBus.emit("table:arp-update", {
          deviceId: this.deviceId,
          tableType: "arp",
          action: "timeout",
          entry,
          explanation: `ARP: Timeout — ${ip} removido da tabela (expirou após ${entry.timeout} ticks)`,
        });
      }
    }
  }

  /** Retornar todas as entradas (para UI) */
  getAll(): ARPEntry[] {
    return Array.from(this.entries.values());
  }

  /** Limpar toda a tabela */
  clear(): void {
    this.entries.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAM TABLE (MAC Address Table — Switches)
// ═══════════════════════════════════════════════════════════════════════════

export class CAMTable {
  private entries = new Map<string, CAMEntry>();
  private eventBus: SimEventBus;
  private deviceId: string;

  constructor(deviceId: string, eventBus: SimEventBus) {
    this.deviceId = deviceId;
    this.eventBus = eventBus;
  }

  /** Buscar porta pelo MAC */
  lookup(mac: string): CAMEntry | null {
    return this.entries.get(mac.toUpperCase()) ?? null;
  }

  /** Aprender um MAC em uma porta (source learning) */
  learn(mac: string, interfaceId: string, currentTick: number): void {
    const normalizedMac = mac.toUpperCase();
    const existing = this.entries.get(normalizedMac);
    const entry: CAMEntry = {
      macAddress: normalizedMac,
      interfaceId,
      learnedAt: currentTick,
      agingTime: 300,
    };

    this.entries.set(normalizedMac, entry);

    // Só emitir evento se for novo ou mudou de porta
    if (!existing || existing.interfaceId !== interfaceId) {
      this.eventBus.emit("table:cam-update", {
        deviceId: this.deviceId,
        tableType: "cam",
        action: existing ? "update" : "add",
        entry,
        explanation: existing
          ? `CAM: MAC ${normalizedMac} movido da porta ${existing.interfaceId} para ${interfaceId}`
          : `CAM: Aprendido MAC ${normalizedMac} na porta ${interfaceId}`,
      });
    }
  }

  /** Processar aging — remover MACs inativos */
  age(currentTick: number): void {
    for (const [mac, entry] of this.entries) {
      if (currentTick - entry.learnedAt > entry.agingTime) {
        this.entries.delete(mac);
        this.eventBus.emit("table:cam-update", {
          deviceId: this.deviceId,
          tableType: "cam",
          action: "timeout",
          entry,
          explanation: `CAM: MAC ${mac} removido por aging (${entry.agingTime} ticks sem atividade)`,
        });
      }
    }
  }

  /** Retornar todas as entradas */
  getAll(): CAMEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING TABLE
// ═══════════════════════════════════════════════════════════════════════════

export class RoutingTable {
  private routes: RouteEntry[] = [];
  private eventBus: SimEventBus;
  private deviceId: string;

  constructor(deviceId: string, eventBus: SimEventBus) {
    this.deviceId = deviceId;
    this.eventBus = eventBus;
  }

  /**
   * Longest Prefix Match — busca a rota mais específica para o destino.
   * Implementação correta de IP routing lookup.
   */
  lookup(destIp: string): RouteEntry | null {
    if (!isValidIp(destIp)) return null;

    const destNum = ipToNumber(destIp);
    let bestMatch: RouteEntry | null = null;
    let longestPrefix = -1;

    for (const route of this.routes) {
      const networkNum = ipToNumber(route.network);
      const maskNum = ipToNumber(route.mask);

      // Verificar se o destino está nesta rede
      if ((destNum & maskNum) === (networkNum & maskNum)) {
        if (route.prefixLength > longestPrefix) {
          longestPrefix = route.prefixLength;
          bestMatch = route;
        }
      }
    }

    return bestMatch;
  }

  /** Adicionar rota diretamente conectada */
  addConnectedRoute(network: string, mask: string, outInterface: string): void {
    const prefixLength = this.maskToPrefix(mask);
    const normalizedNetwork = getNetworkAddress(network, mask);

    // Evitar duplicatas
    const exists = this.routes.find(
      (r) =>
        r.network === normalizedNetwork &&
        r.mask === mask &&
        r.type === "connected",
    );
    if (exists) return;

    const entry: RouteEntry = {
      network: normalizedNetwork,
      mask,
      prefixLength,
      nextHop: null,
      outInterface,
      type: "connected",
      adminDistance: 0,
      metric: 0,
    };

    this.routes.push(entry);
    this.sortRoutes();

    this.eventBus.emit("table:route-update", {
      deviceId: this.deviceId,
      tableType: "route",
      action: "add",
      entry,
      explanation: `Routing: Rota diretamente conectada adicionada — ${normalizedNetwork}/${prefixLength} via ${outInterface}`,
    });
  }

  /** Adicionar rota estática */
  addStaticRoute(
    network: string,
    mask: string,
    nextHop: string,
    outInterface?: string,
  ): boolean {
    const prefixLength = this.maskToPrefix(mask);
    const normalizedNetwork = getNetworkAddress(network, mask);

    // Verificar se já existe rota idêntica
    const exists = this.routes.find(
      (r) =>
        r.network === normalizedNetwork &&
        r.mask === mask &&
        r.nextHop === nextHop &&
        r.type === "static",
    );
    if (exists) return false;

    const entry: RouteEntry = {
      network: normalizedNetwork,
      mask,
      prefixLength,
      nextHop,
      outInterface: outInterface ?? "",
      type: "static",
      adminDistance: 1,
      metric: 0,
    };

    this.routes.push(entry);
    this.sortRoutes();

    this.eventBus.emit("table:route-update", {
      deviceId: this.deviceId,
      tableType: "route",
      action: "add",
      entry,
      explanation: `Routing: Rota estática adicionada — ${normalizedNetwork}/${prefixLength} via ${nextHop}`,
    });

    return true;
  }

  /** Remover rota */
  removeRoute(network: string, mask: string, nextHop?: string): boolean {
    const normalizedNetwork = getNetworkAddress(network, mask);
    const idx = this.routes.findIndex(
      (r) =>
        r.network === normalizedNetwork &&
        r.mask === mask &&
        (nextHop === undefined || r.nextHop === nextHop),
    );

    if (idx < 0) return false;

    const [entry] = this.routes.splice(idx, 1);
    this.eventBus.emit("table:route-update", {
      deviceId: this.deviceId,
      tableType: "route",
      action: "remove",
      entry,
      explanation: `Routing: Rota removida — ${entry.network}/${entry.prefixLength}`,
    });

    return true;
  }

  /** Retornar todas as rotas (para UI / show ip route) */
  getAll(): RouteEntry[] {
    return [...this.routes];
  }

  clear(): void {
    this.routes = [];
  }

  /** Verificar se existe rota default (0.0.0.0/0) */
  hasDefaultRoute(): boolean {
    return this.routes.some(
      (r) => r.network === "0.0.0.0" && r.mask === "0.0.0.0",
    );
  }

  // ─── Private ────────────────────────────────────────────────────────

  /** Ordenar por longest prefix first (mais específica primeiro) */
  private sortRoutes(): void {
    this.routes.sort((a, b) => {
      // Longest prefix primeiro
      if (b.prefixLength !== a.prefixLength)
        return b.prefixLength - a.prefixLength;
      // Menor admin distance ganha
      return a.adminDistance - b.adminDistance;
    });
  }

  private maskToPrefix(mask: string): number {
    const num = ipToNumber(mask);
    let count = 0;
    let n = num;
    while (n) {
      count += n & 1;
      n >>>= 1;
    }
    return count;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VIRTUAL FILE SYSTEM (running-config / startup-config)
// ═══════════════════════════════════════════════════════════════════════════

export class VirtualConfig {
  private running: Record<string, unknown> = {};
  private startup: Record<string, unknown> = {};

  /** Ler valor da running-config */
  get<T = unknown>(key: string): T | undefined {
    return this.running[key] as T | undefined;
  }

  /** Escrever na running-config */
  set(key: string, value: unknown): void {
    this.running[key] = value;
  }

  /** Remover da running-config */
  delete(key: string): void {
    delete this.running[key];
  }

  /** Copiar running → startup (write memory / copy run start) */
  saveToStartup(): void {
    this.startup = JSON.parse(JSON.stringify(this.running));
  }

  /** Copiar startup → running (reboot) */
  loadFromStartup(): void {
    this.running = JSON.parse(JSON.stringify(this.startup));
  }

  /** Exportar running-config como texto IOS-like */
  exportRunningConfig(
    hostname: string,
    interfaces: NetworkInterface[],
  ): string[] {
    const lines: string[] = [
      "!",
      `! Running configuration — ${hostname}`,
      "!",
      `hostname ${hostname}`,
      "!",
    ];

    // Interfaces
    for (const iface of interfaces) {
      lines.push(`interface ${iface.name}`);
      if (iface.ipConfig) {
        lines.push(
          ` ip address ${iface.ipConfig.address} ${iface.ipConfig.mask}`,
        );
      }
      if (!iface.adminUp) {
        lines.push(" shutdown");
      } else {
        lines.push(" no shutdown");
      }
      lines.push("!");
    }

    // Rotas estáticas
    const staticRoutes = this.get<RouteEntry[]>("staticRoutes") ?? [];
    for (const route of staticRoutes) {
      if (route.type === "static" && route.nextHop) {
        lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`);
      }
    }

    lines.push("!", "end");
    return lines;
  }

  /** Obter running como objeto serializável */
  getRunning(): Record<string, unknown> {
    return { ...this.running };
  }

  /** Obter startup como objeto serializável */
  getStartup(): Record<string, unknown> {
    return { ...this.startup };
  }

  clear(): void {
    this.running = {};
    this.startup = {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE STATE MANAGER — Agrega todas as tabelas por dispositivo
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos que possuem tabela de roteamento */
const L3_DEVICE_TYPES: DeviceType[] = [
  "router",
  "switch-l3",
  "pc",
  "laptop",
  "server",
  "ip-phone",
  "printer",
  "firewall",
];

/** Tipos que possuem CAM table */
const SWITCH_TYPES: DeviceType[] = ["switch-l2", "switch-l3"];

export class DeviceStateManager {
  private states = new Map<
    string,
    {
      arpTable: ARPTable;
      camTable: CAMTable;
      routingTable: RoutingTable;
      virtualConfig: VirtualConfig;
      deviceType: DeviceType;
    }
  >();
  private eventBus: SimEventBus;

  constructor(eventBus: SimEventBus) {
    this.eventBus = eventBus;
  }

  /** Inicializar ou obter estado de um dispositivo */
  getOrCreate(
    deviceId: string,
    deviceType: DeviceType,
  ): {
    arpTable: ARPTable;
    camTable: CAMTable;
    routingTable: RoutingTable;
    virtualConfig: VirtualConfig;
  } {
    if (!this.states.has(deviceId)) {
      this.states.set(deviceId, {
        arpTable: new ARPTable(deviceId, this.eventBus),
        camTable: new CAMTable(deviceId, this.eventBus),
        routingTable: new RoutingTable(deviceId, this.eventBus),
        virtualConfig: new VirtualConfig(),
        deviceType,
      });
    }
    return this.states.get(deviceId)!;
  }

  /** Verificar se dispositivo tem capacidade L3 */
  isL3Device(deviceType: DeviceType): boolean {
    return L3_DEVICE_TYPES.includes(deviceType);
  }

  /** Verificar se dispositivo é switch */
  isSwitch(deviceType: DeviceType): boolean {
    return SWITCH_TYPES.includes(deviceType);
  }

  /** Obter estado de um dispositivo */
  get(deviceId: string) {
    return this.states.get(deviceId) ?? null;
  }

  /** Processar aging de todas as tabelas */
  ageAll(currentTick: number): void {
    for (const [, state] of this.states) {
      state.arpTable.age(currentTick);
      state.camTable.age(currentTick);
    }
  }

  /** Obter snapshot serializado do estado de todos os dispositivos */
  serialize(): DeviceSimState[] {
    const result: DeviceSimState[] = [];
    for (const [deviceId, state] of this.states) {
      result.push({
        deviceId,
        arpTable: state.arpTable.getAll(),
        camTable: state.camTable.getAll(),
        routingTable: state.routingTable.getAll(),
        runningConfig: state.virtualConfig.getRunning(),
        startupConfig: state.virtualConfig.getStartup(),
      });
    }
    return result;
  }

  /** Resetar todos os estados */
  reset(): void {
    for (const [, state] of this.states) {
      state.arpTable.clear();
      state.camTable.clear();
      state.routingTable.clear();
      state.virtualConfig.clear();
    }
    this.states.clear();
  }

  /** Remover estado de um dispositivo */
  remove(deviceId: string): void {
    this.states.delete(deviceId);
  }
}
