// ─── ICMP Service ───────────────────────────────────────────────────────────
// Implementação pedagógica do ICMP (Internet Control Message Protocol).
//
// Fluxo de Ping completo:
// 1. PC-A executa "ping 192.168.1.20"
// 2. Verificar se destino está na mesma sub-rede (ou usar gateway)
// 3. Resolver MAC via ARP (se necessário — ver ARPService)
// 4. Criar ICMP Echo Request e encaminhar
// 5. Destino recebe e gera ICMP Echo Reply
// 6. Reply volta ao remetente original
//
// Tratamento de erros pedagógico:
// - TTL expired → gera TTL Exceeded
// - No route → gera Destination Unreachable
// - Port down → pacote descartado com explicação visual

import type { Node } from "reactflow";
import type { NetworkDeviceData, NetworkInterface } from "@/types/network";
import type {
  SimPacket,
  ICMPPayload,
  ConsoleLogEvent,
} from "@/types/simulation";
import { SimEventBus } from "../core/eventBus";
import { DeviceStateManager } from "../core/deviceState";
import { PacketScheduler } from "../core/packetScheduler";
import {
  createICMPEchoRequest,
  createICMPEchoReply,
  createICMPUnreachable,
  createICMPTTLExceeded,
} from "../core/packetFactory";
import { isSameSubnet, isValidIp } from "@/utils/ipUtils";

type NetworkNode = Node<NetworkDeviceData>;

export interface ICMPPingRequest {
  sourceNode: NetworkNode;
  targetIp: string;
  targetNodeId: string;
  /** MAC de destino (já resolvido via ARP) */
  dstMac: string;
  /** Interface de saída */
  outInterface: NetworkInterface;
}

export interface ICMPProcessResult {
  /** Pacotes gerados pela operação */
  packets: SimPacket[];
  /** Logs gerados */
  logs: ConsoleLogEvent[];
  /** Se o processamento foi bem-sucedido */
  success: boolean;
}

/**
 * ICMPService — Gerencia Echo Request/Reply e mensagens de erro.
 */
export class ICMPService {
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
   * Criar e iniciar um ICMP Echo Request (Ping).
   * Chamado após ARP ter sido resolvido com sucesso.
   */
  createPing(request: ICMPPingRequest): ICMPProcessResult {
    const { sourceNode, targetIp, targetNodeId, dstMac, outInterface } =
      request;
    const tick = this.scheduler.getCurrentTick();
    const logs: ConsoleLogEvent[] = [];

    const srcIp = outInterface.ipConfig?.address ?? sourceNode.data.ipAddress;
    const srcMac = outInterface.macAddress ?? sourceNode.data.macAddress;

    if (!srcIp || !isValidIp(srcIp)) {
      logs.push(
        this.createLog(
          "error",
          sourceNode.data.label,
          "ICMP: Falha — interface de saída não tem IP configurado",
        ),
      );
      return { packets: [], logs, success: false };
    }

    const echoRequest = createICMPEchoRequest(
      srcMac,
      dstMac,
      srcIp,
      targetIp,
      sourceNode.id,
      targetNodeId,
      tick,
    );

    this.eventBus.emit("packet:created", { packet: echoRequest });
    this.eventBus.emit("announce", {
      message: `${sourceNode.data.label} enviou ICMP Echo Request para ${targetIp}`,
      priority: "polite",
    });

    logs.push(
      this.createLog(
        "info",
        sourceNode.data.label,
        `ICMP: Echo Request enviado para ${targetIp} (seq=${(echoRequest.payload as ICMPPayload).sequence})`,
        `src=${srcIp} dst=${targetIp} ttl=64`,
      ),
    );

    return { packets: [echoRequest], logs, success: true };
  }

  /**
   * Processar um ICMP Echo Request recebido pelo dispositivo destino.
   * Gera um Echo Reply de volta.
   */
  handleEchoRequest(
    receiverNode: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface,
  ): ICMPProcessResult {
    const logs: ConsoleLogEvent[] = [];
    const tick = this.scheduler.getCurrentTick();

    const myIp =
      ingressInterface.ipConfig?.address ?? receiverNode.data.ipAddress;
    const myMac = ingressInterface.macAddress ?? receiverNode.data.macAddress;

    if (!myIp) {
      logs.push(
        this.createLog(
          "error",
          receiverNode.data.label,
          "ICMP: Não foi possível gerar reply — sem IP configurado",
        ),
      );
      return { packets: [], logs, success: false };
    }

    // Precisamos do MAC do sender original para enviar o reply
    const dstMac = packet.layer2.srcMac;

    const echoReply = createICMPEchoReply(
      packet,
      myMac,
      myIp,
      receiverNode.id,
      dstMac,
      tick,
    );

    this.eventBus.emit("packet:created", { packet: echoReply });

    const payload = packet.payload as ICMPPayload;
    logs.push(
      this.createLog(
        "success",
        receiverNode.data.label,
        `ICMP: Echo Reply enviado para ${packet.layer3.srcIp} (seq=${payload.sequence})`,
        `src=${myIp} dst=${packet.layer3.srcIp} ttl=64`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${receiverNode.data.label} respondeu ICMP Echo Reply para ${packet.layer3.srcIp}`,
      priority: "polite",
    });

    return { packets: [echoReply], logs, success: true };
  }

  /**
   * Processar um ICMP Echo Reply recebido de volta pelo sender original.
   * Marca o ping como bem-sucedido.
   */
  handleEchoReply(
    receiverNode: NetworkNode,
    packet: SimPacket,
  ): ICMPProcessResult {
    const logs: ConsoleLogEvent[] = [];
    const payload = packet.payload as ICMPPayload;

    const rtt = this.scheduler.getCurrentTick() - packet.createdAt;

    logs.push(
      this.createLog(
        "success",
        receiverNode.data.label,
        `ICMP: Reply de ${packet.layer3.srcIp} — seq=${payload.sequence} ttl=${packet.layer3.ttl} time=${rtt}ms`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${receiverNode.data.label} recebeu resposta de ping de ${packet.layer3.srcIp}. Sucesso!`,
      priority: "assertive",
    });

    return { packets: [], logs, success: true };
  }

  /**
   * Gerar mensagem ICMP Destination Unreachable.
   * Chamado quando o roteador não encontra rota para o destino.
   */
  generateUnreachable(
    routerNode: NetworkNode,
    originalPacket: SimPacket,
    outInterface: NetworkInterface,
  ): ICMPProcessResult {
    const logs: ConsoleLogEvent[] = [];
    const tick = this.scheduler.getCurrentTick();

    const myIp = outInterface.ipConfig?.address ?? routerNode.data.ipAddress;
    const myMac = outInterface.macAddress ?? routerNode.data.macAddress;

    if (!myIp) {
      return { packets: [], logs, success: false };
    }

    const unreachable = createICMPUnreachable(
      originalPacket,
      myMac,
      myIp,
      routerNode.id,
      originalPacket.layer2.srcMac,
      tick,
    );

    this.eventBus.emit("packet:created", { packet: unreachable });
    logs.push(
      this.createLog(
        "error",
        routerNode.data.label,
        `ICMP: Destination Unreachable enviado para ${originalPacket.layer3.srcIp}`,
        `No route to ${originalPacket.layer3.dstIp}`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${routerNode.data.label}: Destino ${originalPacket.layer3.dstIp} inalcançável — sem rota`,
      priority: "assertive",
    });

    return { packets: [unreachable], logs, success: true };
  }

  /**
   * Gerar mensagem ICMP TTL Exceeded.
   * Chamado quando TTL chega a 0 em um roteador.
   */
  generateTTLExceeded(
    routerNode: NetworkNode,
    originalPacket: SimPacket,
    outInterface: NetworkInterface,
  ): ICMPProcessResult {
    const logs: ConsoleLogEvent[] = [];
    const tick = this.scheduler.getCurrentTick();

    const myIp = outInterface.ipConfig?.address ?? routerNode.data.ipAddress;
    const myMac = outInterface.macAddress ?? routerNode.data.macAddress;

    if (!myIp) {
      return { packets: [], logs, success: false };
    }

    const ttlExceeded = createICMPTTLExceeded(
      originalPacket,
      myMac,
      myIp,
      routerNode.id,
      originalPacket.layer2.srcMac,
      tick,
    );

    this.eventBus.emit("packet:created", { packet: ttlExceeded });
    logs.push(
      this.createLog(
        "error",
        routerNode.data.label,
        `ICMP: TTL Exceeded — pacote de ${originalPacket.layer3.srcIp} descartado`,
        `TTL expirou ao encaminhar para ${originalPacket.layer3.dstIp}`,
      ),
    );
    this.eventBus.emit("announce", {
      message: `${routerNode.data.label}: TTL expirado para pacote de ${originalPacket.layer3.srcIp}`,
      priority: "assertive",
    });

    return { packets: [ttlExceeded], logs, success: true };
  }

  /**
   * Determinar se o destino está na mesma sub-rede que o source,
   * ou se precisa usar o gateway.
   */
  needsGateway(
    sourceNode: NetworkNode,
    destIp: string,
    outInterface: NetworkInterface,
  ): boolean {
    const srcIp = outInterface.ipConfig?.address ?? sourceNode.data.ipAddress;
    const srcMask = outInterface.ipConfig?.mask ?? sourceNode.data.subnetMask;

    if (!srcIp || !srcMask || !isValidIp(srcIp) || !isValidIp(srcMask)) {
      return true;
    }

    return !isSameSubnet(srcIp, srcMask, destIp, srcMask);
  }

  // ─── Private Helpers ────────────────────────────────────────────────

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
