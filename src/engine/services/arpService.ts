// ─── ARP Service ────────────────────────────────────────────────────────────
// Implementação pedagógica do Address Resolution Protocol.
//
// Fluxo completo observável:
// 1. PC quer pingar um IP mas não tem o MAC → ARP é necessário
// 2. PC gera ARP Request (broadcast: FF:FF:FF:FF:FF:FF)
// 3. Switch propaga o broadcast por todas as portas (exceto a de origem)
// 4. Apenas o dispositivo com o IP correspondente responde (ARP Reply)
// 5. PC recebe o reply, popula a ARP Table, e só então envia o ICMP

import type { Node, Edge } from "reactflow";
import type { NetworkDeviceData, NetworkInterface } from "@/types/network";
import type {
  SimPacket,
  ARPPayload,
  ConsoleLogEvent,
} from "@/types/simulation";
import { BROADCAST_MAC } from "@/types/simulation";
import { SimEventBus } from "../core/eventBus";
import { DeviceStateManager } from "../core/deviceState";
import { PacketScheduler } from "../core/packetScheduler";
import { createARPRequest, createARPReply } from "../core/packetFactory";

type NetworkNode = Node<NetworkDeviceData>;

export interface ARPResolutionResult {
  /** Se a resolução foi bem-sucedida (MAC encontrado na tabela) */
  resolved: boolean;
  /** MAC encontrado (se resolved = true) */
  mac: string | null;
  /** Pacotes gerados (ARP request se não resolvido) */
  generatedPackets: SimPacket[];
  /** Logs gerados */
  logs: ConsoleLogEvent[];
}

/**
 * ARPService — Gerencia a resolução de endereços IP → MAC.
 *
 * Pedagogicamente, este é um dos conceitos mais importantes porque
 * mostra ao aluno que mesmo um simples "ping" depende de uma
 * resolução de endereço antes de enviar qualquer dado.
 */
export class ARPService {
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
   * Tenta resolver o MAC para um IP. Se não está na tabela ARP,
   * gera um ARP Request broadcast.
   *
   * @returns Resultado com MAC (se encontrado) ou pacotes ARP gerados
   */
  resolveMAC(
    sourceNode: NetworkNode,
    targetIp: string,
    outInterface: NetworkInterface,
  ): ARPResolutionResult {
    const state = this.deviceStates.getOrCreate(
      sourceNode.id,
      sourceNode.data.deviceType,
    );
    const tick = this.scheduler.getCurrentTick();
    const logs: ConsoleLogEvent[] = [];

    // 1. Verificar ARP cache
    const cached = state.arpTable.lookup(targetIp);
    if (cached) {
      logs.push(
        this.createLog(
          "info",
          sourceNode.data.label,
          `ARP: Cache hit — ${targetIp} → ${cached.macAddress}`,
        ),
      );

      return {
        resolved: true,
        mac: cached.macAddress,
        generatedPackets: [],
        logs,
      };
    }

    // 2. MAC não encontrado — gerar ARP Request
    const srcIp = outInterface.ipConfig?.address ?? sourceNode.data.ipAddress;
    const srcMac = outInterface.macAddress ?? sourceNode.data.macAddress;

    if (!srcIp) {
      logs.push(
        this.createLog(
          "error",
          sourceNode.data.label,
          `ARP: Falha — interface ${outInterface.shortName} não tem IP configurado`,
        ),
      );
      return { resolved: false, mac: null, generatedPackets: [], logs };
    }

    const arpRequest = createARPRequest(
      srcMac,
      srcIp,
      targetIp,
      sourceNode.id,
      tick,
    );

    logs.push(
      this.createLog(
        "warn",
        sourceNode.data.label,
        `ARP: Cache miss para ${targetIp} — enviando ARP Request (broadcast)`,
        `Who has ${targetIp}? Tell ${srcIp} (${srcMac})`,
      ),
    );

    // Emitir evento de criação do pacote
    this.eventBus.emit("packet:created", { packet: arpRequest });
    this.eventBus.emit("announce", {
      message: `${sourceNode.data.label} enviou ARP Request broadcast: "Quem tem ${targetIp}?"`,
      priority: "polite",
    });

    return {
      resolved: false,
      mac: null,
      generatedPackets: [arpRequest],
      logs,
    };
  }

  /**
   * Processar um ARP Request recebido por um dispositivo.
   *
   * - Se o dispositivo tem o IP alvo → gera ARP Reply
   * - Sempre aprende o sender MAC/IP na tabela ARP
   */
  handleARPRequest(
    receiverNode: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface,
  ): SimPacket[] {
    const payload = packet.payload as ARPPayload;
    const state = this.deviceStates.getOrCreate(
      receiverNode.id,
      receiverNode.data.deviceType,
    );
    const tick = this.scheduler.getCurrentTick();

    // Aprender o sender (gratuitous ARP learning)
    state.arpTable.add(
      payload.senderIp,
      payload.senderMac,
      ingressInterface.id,
      tick,
    );

    this.eventBus.emit(
      "console:log",
      this.createLog(
        "info",
        receiverNode.data.label,
        `ARP: Aprendido ${payload.senderIp} → ${payload.senderMac} (do request)`,
      ),
    );

    // Verificar se somos o target
    const myIp = this.getDeviceIpOnInterface(receiverNode, ingressInterface);
    if (!myIp || myIp !== payload.targetIp) {
      // Não somos o target — ignorar (switches fazem flooding, não resposta)
      return [];
    }

    // Somos o target — gerar ARP Reply!
    const myMac = ingressInterface.macAddress ?? receiverNode.data.macAddress;

    const reply = createARPReply(
      myMac,
      myIp,
      payload.senderMac,
      payload.senderIp,
      receiverNode.id,
      packet.sourceNodeId,
      tick,
    );

    this.eventBus.emit("packet:created", { packet: reply });
    this.eventBus.emit(
      "console:log",
      this.createLog(
        "success",
        receiverNode.data.label,
        `ARP: Reply enviado — ${myIp} is-at ${myMac}`,
        `Respondendo para ${payload.senderIp} (${payload.senderMac})`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${receiverNode.data.label} respondeu ARP Reply: "${myIp} está em ${myMac}"`,
      priority: "polite",
    });

    return [reply];
  }

  /**
   * Processar ARP Reply recebido — popular tabela ARP.
   */
  handleARPReply(
    receiverNode: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface,
  ): void {
    const payload = packet.payload as ARPPayload;
    const state = this.deviceStates.getOrCreate(
      receiverNode.id,
      receiverNode.data.deviceType,
    );
    const tick = this.scheduler.getCurrentTick();

    // Popular tabela ARP com a informação recebida
    state.arpTable.add(
      payload.senderIp,
      payload.senderMac,
      ingressInterface.id,
      tick,
    );

    this.eventBus.emit(
      "console:log",
      this.createLog(
        "success",
        receiverNode.data.label,
        `ARP: Tabela atualizada — ${payload.senderIp} → ${payload.senderMac}`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${receiverNode.data.label} aprendeu o MAC de ${payload.senderIp}: ${payload.senderMac}`,
      priority: "polite",
    });
  }

  /**
   * Verificar se o dispositivo precisa de ARP para alcançar o destino.
   */
  needsARPResolution(sourceNode: NetworkNode, targetIp: string): boolean {
    const state = this.deviceStates.get(sourceNode.id);
    if (!state) return true;
    return state.arpTable.lookup(targetIp) === null;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private getDeviceIpOnInterface(
    node: NetworkNode,
    iface: NetworkInterface,
  ): string | null {
    // Primeiro, tentar IP da interface específica
    if (iface.ipConfig?.address) return iface.ipConfig.address;
    // Fallback para IP global do dispositivo
    if (node.data.ipAddress) return node.data.ipAddress;
    return null;
  }

  private createLog(
    level: ConsoleLogEvent["level"],
    source: string,
    message: string,
    details?: string,
  ): ConsoleLogEvent {
    return {
      level,
      timestamp: Date.now(),
      source,
      message,
      details,
    };
  }
}
