// ─── Switching Service ──────────────────────────────────────────────────────
// Motor de comutação Layer 2 — implementa o comportamento de um switch real.
//
// Operações:
// 1. Source MAC Learning → Popular CAM Table
// 2. Destination Lookup → Encaminhar pela porta correta
// 3. Unknown Unicast / Broadcast → Flooding por todas as portas (exceto ingress)
//
// Pedagogicamente, este serviço mostra ao aluno a diferença entre
// hub (flooding cego) e switch (forwarding inteligente via CAM table).

import type { Node, Edge } from "reactflow";
import type { NetworkDeviceData, NetworkInterface } from "@/types/network";
import type { SimPacket, ConsoleLogEvent } from "@/types/simulation";
import { BROADCAST_MAC } from "@/types/simulation";
import { SimEventBus } from "../core/eventBus";
import { DeviceStateManager } from "../core/deviceState";
import { PacketScheduler } from "../core/packetScheduler";

type NetworkNode = Node<NetworkDeviceData>;

/** Resultado da decisão de switching */
export interface SwitchingDecision {
  /** Ação tomada */
  action: "forward" | "flood" | "drop" | "filter";
  /** Portas de saída (IDs de interface) */
  outPorts: string[];
  /** Logs gerados */
  logs: ConsoleLogEvent[];
}

/**
 * SwitchingService — Comutação Layer 2 baseada em MAC address.
 */
export class SwitchingService {
  private eventBus: SimEventBus;
  private deviceStates: DeviceStateManager;
  private scheduler: PacketScheduler;

  constructor(
    eventBus: SimEventBus,
    deviceStates: DeviceStateManager,
    scheduler: PacketScheduler,
  ) {
    this.eventBus = eventBus;
    this.deviceStates = deviceStates;
    this.scheduler = scheduler;
  }

  /**
   * Processar um frame recebido por um switch.
   *
   * 1. Aprende o source MAC na porta de ingress (source learning)
   * 2. Verifica se o dst MAC está na CAM table
   *    - Se sim: forward pela porta específica
   *    - Se não (ou broadcast): flood por todas as portas exceto ingress
   */
  processFrame(
    switchNode: NetworkNode,
    packet: SimPacket,
    ingressInterfaceId: string,
  ): SwitchingDecision {
    const logs: ConsoleLogEvent[] = [];
    const state = this.deviceStates.getOrCreate(
      switchNode.id,
      switchNode.data.deviceType,
    );
    const tick = this.scheduler.getCurrentTick();

    // ─── Step 1: Source Learning ──────────────────────────────────────
    const srcMac = packet.layer2.srcMac;
    if (srcMac && srcMac !== BROADCAST_MAC) {
      state.camTable.learn(srcMac, ingressInterfaceId, tick);
      logs.push(
        this.createLog(
          "info",
          switchNode.data.label,
          `Switch: MAC ${srcMac} aprendido na porta ${this.getPortName(switchNode, ingressInterfaceId)}`,
        ),
      );
    }

    // ─── Step 2: Destination Lookup ──────────────────────────────────
    const dstMac = packet.layer2.dstMac;

    // Broadcast → Flooding
    if (dstMac === BROADCAST_MAC || packet.isBroadcast) {
      const floodPorts = this.getFloodPorts(switchNode, ingressInterfaceId);

      logs.push(
        this.createLog(
          "warn",
          switchNode.data.label,
          `Switch: Frame broadcast (${srcMac} → FF:FF:FF:FF:FF:FF) — flooding por ${floodPorts.length} porta(s)`,
          `Portas: ${floodPorts.map((p) => this.getPortName(switchNode, p)).join(", ")}`,
        ),
      );

      this.eventBus.emit("announce", {
        message: `${switchNode.data.label}: Broadcast detectado — enviando por todas as portas`,
        priority: "polite",
      });

      return { action: "flood", outPorts: floodPorts, logs };
    }

    // Unicast — buscar na CAM table
    const camEntry = state.camTable.lookup(dstMac);

    if (camEntry) {
      // MAC conhecido — forward pela porta específica
      // Verificar se não é a mesma porta de entrada (filtering)
      if (camEntry.interfaceId === ingressInterfaceId) {
        logs.push(
          this.createLog(
            "info",
            switchNode.data.label,
            `Switch: Frame de ${srcMac} → ${dstMac} filtrado (mesma porta de entrada e saída)`,
          ),
        );
        return { action: "filter", outPorts: [], logs };
      }

      logs.push(
        this.createLog(
          "info",
          switchNode.data.label,
          `Switch: Frame ${srcMac} → ${dstMac} encaminhado via ${this.getPortName(switchNode, camEntry.interfaceId)}`,
          `CAM Table: ${dstMac} → porta ${this.getPortName(switchNode, camEntry.interfaceId)}`,
        ),
      );

      return { action: "forward", outPorts: [camEntry.interfaceId], logs };
    }

    // Unknown unicast → Flooding
    const floodPorts = this.getFloodPorts(switchNode, ingressInterfaceId);

    logs.push(
      this.createLog(
        "warn",
        switchNode.data.label,
        `Switch: MAC ${dstMac} desconhecido — unknown unicast flooding por ${floodPorts.length} porta(s)`,
        `MAC não encontrado na CAM Table. Flooding para aprender.`,
      ),
    );

    this.eventBus.emit("announce", {
      message: `${switchNode.data.label}: MAC desconhecido — flooding para encontrar ${dstMac}`,
      priority: "polite",
    });

    return { action: "flood", outPorts: floodPorts, logs };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Obter todas as portas para flooding (ativas, conectadas, exceto ingress).
   */
  private getFloodPorts(
    switchNode: NetworkNode,
    excludePortId: string,
  ): string[] {
    return switchNode.data.interfaces
      .filter(
        (iface) =>
          iface.id !== excludePortId &&
          iface.adminUp &&
          iface.connectedEdgeId !== null,
      )
      .map((iface) => iface.id);
  }

  /** Obter nome amigável da porta */
  private getPortName(node: NetworkNode, interfaceId: string): string {
    const iface = node.data.interfaces.find((i) => i.id === interfaceId);
    return iface?.shortName ?? interfaceId;
  }

  private createLog(
    level: ConsoleLogEvent["level"],
    source: string,
    message: string,
    details?: string,
  ): ConsoleLogEvent {
    return { level, timestamp: Date.now(), source, message, details };
  }
}
