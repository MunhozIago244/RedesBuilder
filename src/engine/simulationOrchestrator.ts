// ─── Simulation Orchestrator ─────────────────────────────────────────────────
// O "Maestro" da simulação — coordena EventBus, Scheduler, e todos os serviços
// para executar o fluxo completo de um Ping pedagógico:
//
//  PC-A → [ARP Req] → Switch → [ARP Req flood] → PC-B
//  PC-B → [ARP Reply] → Switch → [ARP Reply forward] → PC-A
//  PC-A → [ICMP Echo Request] → Switch → Router → Switch → PC-B
//  PC-B → [ICMP Echo Reply] → Switch → Router → Switch → PC-A
//
// Cada passo é observável via eventos no EventBus.

import type { Node, Edge } from "reactflow";
import type { NetworkDeviceData, NetworkInterface } from "@/types/network";
import type {
  SimPacket,
  ScheduledEvent,
  SimulationSummary,
  ConsoleLogEvent,
  SimulationSpeed,
  ARPPayload,
  ICMPPayload,
} from "@/types/simulation";
import { BROADCAST_MAC } from "@/types/simulation";
import { SimEventBus, simEventBus } from "./core/eventBus";
import { PacketScheduler } from "./core/packetScheduler";
import { DeviceStateManager } from "./core/deviceState";
import { ARPService } from "./services/arpService";
import { ICMPService } from "./services/icmpService";
import { RoutingService } from "./services/routingService";
import { SwitchingService } from "./services/switchingService";
import { resetPacketCounter, resetICMPCounters } from "./core/packetFactory";
import { findEdgeBetweenNodes } from "./graphEngine";

type NetworkNode = Node<NetworkDeviceData>;

/** Estado da simulação exposto para a UI */
export interface SimulationState {
  /** Pacotes atualmente em trânsito (para animação) */
  activePackets: SimPacket[];
  /** Pacotes que chegaram ao destino */
  deliveredPackets: SimPacket[];
  /** Pacotes descartados */
  droppedPackets: Array<{ packet: SimPacket; reason: string }>;
  /** Logs do console */
  logs: ConsoleLogEvent[];
  /** Se a simulação está rodando */
  isRunning: boolean;
  /** Tick atual */
  currentTick: number;
  /** Velocidade */
  speed: SimulationSpeed;
}

/**
 * SimulationOrchestrator — coordena toda a simulação de rede.
 *
 * @example
 * ```ts
 * const orchestrator = new SimulationOrchestrator();
 * orchestrator.initialize(nodes, edges);
 * await orchestrator.executePing(sourceNodeId, targetNodeId);
 * ```
 */
export class SimulationOrchestrator {
  readonly eventBus: SimEventBus;
  private scheduler: PacketScheduler;
  private deviceStates: DeviceStateManager;

  // Serviços de protocolo
  private arpService: ARPService;
  private icmpService: ICMPService;
  private routingService: RoutingService;
  private switchingService: SwitchingService;

  // Estado atual do grafo
  private nodes: NetworkNode[] = [];
  private edges: Edge[] = [];

  // Estado da simulação
  private state: SimulationState = {
    activePackets: [],
    deliveredPackets: [],
    droppedPackets: [],
    logs: [],
    isRunning: false,
    currentTick: 0,
    speed: "normal",
  };

  // Fila de pacotes pendentes esperando ARP resolution
  private pendingARPQueue = new Map<string, SimPacket[]>(); // targetIp → packets waiting

  // Resolve da promise do ping em curso
  private pingResolve: ((summary: SimulationSummary) => void) | null = null;
  private maxTicks = 200; // Safety: limite máximo de ticks

  constructor(eventBus?: SimEventBus) {
    this.eventBus = eventBus ?? simEventBus;
    this.scheduler = new PacketScheduler(this.eventBus);
    this.deviceStates = new DeviceStateManager(this.eventBus);

    this.arpService = new ARPService(
      this.eventBus,
      this.deviceStates,
      this.scheduler,
    );
    this.icmpService = new ICMPService(
      this.eventBus,
      this.deviceStates,
      this.scheduler,
    );
    this.routingService = new RoutingService(this.eventBus, this.deviceStates);
    this.switchingService = new SwitchingService(
      this.eventBus,
      this.deviceStates,
      this.scheduler,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Inicializar a engine com o grafo atual.
   * Deve ser chamado antes de qualquer simulação e quando o grafo muda.
   */
  initialize(nodes: NetworkNode[], edges: Edge[]): void {
    this.nodes = nodes;
    this.edges = edges;

    // Inicializar estado e tabelas de roteamento para cada dispositivo
    for (const node of nodes) {
      this.deviceStates.getOrCreate(node.id, node.data.deviceType);
      this.routingService.initializeConnectedRoutes(node);
    }

    this.addLog(
      "info",
      "Engine",
      "Motor de simulação inicializado",
      `${nodes.length} dispositivos, ${edges.length} links`,
    );
  }

  /**
   * Executar um PING completo com fluxo pedagógico.
   * Retorna uma Promise que resolve com o resumo da simulação.
   */
  async executePing(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<SimulationSummary> {
    // Reset estado
    this.resetState();
    resetPacketCounter();
    resetICMPCounters();

    const sourceNode = this.nodes.find((n) => n.id === sourceNodeId);
    const targetNode = this.nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      return this.createFailureSummary([
        "Dispositivo de origem ou destino não encontrado",
      ]);
    }

    // Validações iniciais
    const validationError = this.validatePingPrerequisites(
      sourceNode,
      targetNode,
    );
    if (validationError) {
      return this.createFailureSummary([validationError]);
    }

    this.state.isRunning = true;
    this.eventBus.emit("sim:start", { mode: "ping" });

    this.addLog(
      "info",
      sourceNode.data.label,
      `Ping para ${targetNode.data.ipAddress}...`,
    );
    this.eventBus.emit("announce", {
      message: `Iniciando ping de ${sourceNode.data.label} para ${targetNode.data.label}`,
      priority: "assertive",
    });

    // ─── Step 1: Determinar interface de saída e next hop ──────────
    const targetIp = targetNode.data.ipAddress;
    const outInterface = this.findSourceOutInterface(sourceNode, targetIp);

    if (!outInterface) {
      this.addLog(
        "error",
        sourceNode.data.label,
        "Nenhuma interface ativa e conectada encontrada",
      );
      return this.createFailureSummary([
        "Nenhuma interface disponível para envio",
      ]);
    }

    // Determinar se precisa de gateway
    const needsGateway = this.icmpService.needsGateway(
      sourceNode,
      targetIp,
      outInterface,
    );
    const arpTargetIp = needsGateway ? sourceNode.data.gateway || "" : targetIp;

    if (
      needsGateway &&
      (!sourceNode.data.gateway || sourceNode.data.gateway === "0.0.0.0")
    ) {
      this.addLog(
        "error",
        sourceNode.data.label,
        `Destino ${targetIp} está em outra rede, mas não há gateway configurado`,
      );

      this.eventBus.emit("announce", {
        message: `${sourceNode.data.label}: Sem gateway — não é possível alcançar ${targetIp}`,
        priority: "assertive",
      });

      return this.createFailureSummary([
        `Sem gateway configurado para alcançar ${targetIp}`,
      ]);
    }

    if (needsGateway) {
      this.addLog(
        "info",
        sourceNode.data.label,
        `Destino em outra rede — usando gateway ${arpTargetIp}`,
      );
    }

    // ─── Step 2: ARP Resolution ─────────────────────────────────────
    const arpResult = this.arpService.resolveMAC(
      sourceNode,
      arpTargetIp,
      outInterface,
    );
    this.state.logs.push(...arpResult.logs);

    if (arpResult.resolved && arpResult.mac) {
      // ARP cache hit — enviar ICMP diretamente
      return this.startICMPFlow(
        sourceNode,
        targetNode,
        arpResult.mac,
        outInterface,
      );
    }

    // ARP cache miss — precisa aguardar resolução
    // Colocar o pacote ICMP em espera até ARP resolver
    return new Promise<SimulationSummary>((resolve) => {
      this.pingResolve = resolve;

      // Agendar processamento dos pacotes ARP
      for (const arpPacket of arpResult.generatedPackets) {
        this.processPacketAtNode(sourceNode, arpPacket, outInterface);
      }

      // Iniciar loop de ticks
      this.runTickLoop(sourceNode, targetNode, arpTargetIp, outInterface);
    });
  }

  /** Alterar velocidade da simulação */
  setSpeed(speed: SimulationSpeed): void {
    this.state.speed = speed;
    this.scheduler.setSpeed(speed);
  }

  /** Obter estado atual da simulação (para a UI) */
  getState(): Readonly<SimulationState> {
    return { ...this.state };
  }

  /** Obter estado de tabelas de um dispositivo */
  getDeviceState(deviceId: string) {
    return this.deviceStates.get(deviceId);
  }

  /** Resetar toda a engine */
  reset(): void {
    this.scheduler.reset();
    this.deviceStates.reset();
    this.resetState();
    this.pendingARPQueue.clear();
    this.eventBus.emit("sim:reset", {});
  }

  /** Atualizar o grafo (quando o usuário modifica a topologia) */
  updateGraph(nodes: NetworkNode[], edges: Edge[]): void {
    this.nodes = nodes;
    this.edges = edges;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PACKET PROCESSING PIPELINE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Processar um pacote ao chegar em um nó.
   * Esta é a função central do pipeline — decide o que fazer com cada pacote.
   */
  private processPacketAtNode(
    currentNode: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface | null,
  ): void {
    const deviceType = currentNode.data.deviceType;

    // Switch L2 — opera em Layer 2
    if (this.deviceStates.isSwitch(deviceType) && deviceType === "switch-l2") {
      this.handleSwitchProcessing(currentNode, packet, ingressInterface);
      return;
    }

    // Switch L3 pode fazer switching ou routing
    if (deviceType === "switch-l3") {
      // Se o pacote é para nós (IP do switch), processar L3
      if (this.routingService.isPacketForMe(currentNode, packet.layer3.dstIp)) {
        this.handleL3Processing(currentNode, packet, ingressInterface);
      } else {
        this.handleSwitchProcessing(currentNode, packet, ingressInterface);
      }
      return;
    }

    // Dispositivos L3 (Router, PC, Server, etc.)
    if (this.deviceStates.isL3Device(deviceType)) {
      this.handleL3Processing(currentNode, packet, ingressInterface);
      return;
    }
  }

  /**
   * Processamento Layer 2 (Switch)
   */
  private handleSwitchProcessing(
    switchNode: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface | null,
  ): void {
    const inPortId = ingressInterface?.id ?? "";
    const decision = this.switchingService.processFrame(
      switchNode,
      packet,
      inPortId,
    );
    this.state.logs.push(...decision.logs);

    if (decision.action === "filter" || decision.action === "drop") {
      return; // Frame filtrado/descartado
    }

    // Forward ou Flood — enviar pelas portas de saída
    for (const outPortId of decision.outPorts) {
      const outIface = switchNode.data.interfaces.find(
        (i) => i.id === outPortId,
      );
      if (!outIface?.connectedEdgeId) continue;

      // Encontrar o nó conectado a esta porta
      const nextHop = this.findConnectedNode(
        switchNode.id,
        outIface.connectedEdgeId,
      );
      if (!nextHop) continue;

      // Clonar o pacote para cada porta de saída (flooding)
      const clonedPacket: SimPacket = {
        ...packet,
        id:
          decision.outPorts.length > 1
            ? `${packet.id}-${outPortId}`
            : packet.id,
        currentNodeId: switchNode.id,
        hopCount: packet.hopCount + 1,
      };

      this.schedulePacketMove(
        switchNode,
        nextHop.node,
        clonedPacket,
        outIface,
        nextHop.edge,
      );
    }
  }

  /**
   * Processamento Layer 3 (Router / End Devices)
   */
  private handleL3Processing(
    node: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface | null,
  ): void {
    // ─── ARP Processing ─────────────────────────────────────────────
    if (packet.protocol === "ARP") {
      const arpPayload = packet.payload as ARPPayload;

      if (arpPayload.operation === "request") {
        const replies = this.arpService.handleARPRequest(
          node,
          packet,
          ingressInterface ?? node.data.interfaces[0],
        );

        // Encaminhar replies
        for (const reply of replies) {
          const outIface = ingressInterface ?? node.data.interfaces[0];
          if (outIface?.connectedEdgeId) {
            const nextHop = this.findConnectedNode(
              node.id,
              outIface.connectedEdgeId,
            );
            if (nextHop) {
              this.schedulePacketMove(
                node,
                nextHop.node,
                reply,
                outIface,
                nextHop.edge,
              );
            }
          }
        }
        return;
      }

      if (arpPayload.operation === "reply") {
        this.arpService.handleARPReply(
          node,
          packet,
          ingressInterface ?? node.data.interfaces[0],
        );

        // Verificar se há pacotes ICMP pendentes para este IP
        this.checkPendingARPQueue(
          node,
          arpPayload.senderIp,
          arpPayload.senderMac,
        );
        return;
      }
    }

    // ─── ICMP Processing ────────────────────────────────────────────
    if (packet.protocol === "ICMP") {
      const icmpPayload = packet.payload as ICMPPayload;

      // Verificar se o pacote é para nós
      if (this.routingService.isPacketForMe(node, packet.layer3.dstIp)) {
        if (icmpPayload.type === "echo-request") {
          // Nós somos o destino do ping — gerar reply
          const result = this.icmpService.handleEchoRequest(
            node,
            packet,
            ingressInterface ?? node.data.interfaces[0],
          );
          this.state.logs.push(...result.logs);
          this.state.deliveredPackets.push(packet);

          // Emitir evento de chegada
          this.eventBus.emit("packet:arrive", {
            packet,
            atNodeId: node.id,
            explanation: `ICMP Echo Request entregue a ${node.data.label}`,
            ariaAnnouncement: `Ping chegou a ${node.data.label}! Gerando resposta...`,
          });

          // Encaminhar reply de volta
          for (const replyPacket of result.packets) {
            this.routeAndForward(node, replyPacket);
          }
          return;
        }

        if (icmpPayload.type === "echo-reply") {
          // Recebemos a resposta do ping — SUCESSO!
          const result = this.icmpService.handleEchoReply(node, packet);
          this.state.logs.push(...result.logs);
          this.state.deliveredPackets.push(packet);

          this.eventBus.emit("packet:arrive", {
            packet,
            atNodeId: node.id,
            explanation: `ICMP Echo Reply recebido de ${packet.layer3.srcIp}`,
            ariaAnnouncement: `${node.data.label} recebeu resposta do ping! Simulação concluída com sucesso.`,
          });

          // Sinalizar fim da simulação
          this.completeSimulation(true, [node.id]);
          return;
        }

        // ICMP Unreachable ou TTL Exceeded recebido pelo sender original
        if (
          icmpPayload.type === "unreachable" ||
          icmpPayload.type === "ttl-exceeded"
        ) {
          this.state.deliveredPackets.push(packet);
          this.addLog(
            "error",
            node.data.label,
            `Recebido: ${icmpPayload.type} de ${packet.layer3.srcIp}`,
          );
          this.completeSimulation(
            false,
            [],
            `ICMP ${icmpPayload.type} de ${packet.layer3.srcIp}`,
          );
          return;
        }
      }

      // Pacote NÃO é para nós — precisamos rotear (somos um router)
      if (
        node.data.deviceType === "router" ||
        node.data.deviceType === "switch-l3"
      ) {
        // Decrementar TTL
        const newTtl = packet.layer3.ttl - 1;
        if (newTtl <= 0) {
          // TTL expired!
          this.handleTTLExpired(node, packet, ingressInterface);
          return;
        }

        // Atualizar TTL no pacote
        const routedPacket: SimPacket = {
          ...packet,
          layer3: { ...packet.layer3, ttl: newTtl },
          hopCount: packet.hopCount + 1,
        };

        this.routeAndForward(node, routedPacket);
        return;
      }
    }
  }

  /**
   * Rotear e encaminhar um pacote usando a tabela de roteamento.
   */
  private routeAndForward(node: NetworkNode, packet: SimPacket): void {
    const decision = this.routingService.routePacket(
      node,
      packet,
      this.nodes,
      this.edges,
    );
    this.state.logs.push(...decision.logs);

    if (!decision.canRoute) {
      // Sem rota — gerar ICMP Unreachable ou drop
      this.eventBus.emit("packet:drop", {
        packet,
        atNodeId: node.id,
        reason: "no-route",
        explanation: decision.failReason ?? "Sem rota para o destino",
        ariaAnnouncement: `${node.data.label}: Pacote descartado — ${decision.failReason}`,
      });
      this.state.droppedPackets.push({
        packet,
        reason: decision.failReason ?? "no-route",
      });

      // Se é um router, enviar ICMP Unreachable de volta
      if (node.data.deviceType === "router" && decision.outInterface) {
        const unreachable = this.icmpService.generateUnreachable(
          node,
          packet,
          decision.outInterface,
        );
        this.state.logs.push(...unreachable.logs);
        for (const p of unreachable.packets) {
          this.routeAndForward(node, p);
        }
      }
      return;
    }

    // Delivery local (pacote é para nós) — já tratado acima, mas safety check
    if (!decision.outInterface) return;

    // ARP resolve para o next hop
    const nextHopIp = decision.nextHopIp ?? packet.layer3.dstIp;
    const state = this.deviceStates.get(node.id);
    const arpEntry = state?.arpTable.lookup(nextHopIp);

    if (!arpEntry) {
      // Precisa de ARP para o next hop — enfileirar pacote
      this.enqueuePendingARP(nextHopIp, packet);
      const arpResult = this.arpService.resolveMAC(
        node,
        nextHopIp,
        decision.outInterface,
      );
      this.state.logs.push(...arpResult.logs);

      for (const arpPacket of arpResult.generatedPackets) {
        this.processPacketAtNode(node, arpPacket, decision.outInterface);
      }
      return;
    }

    // Reescrever Layer 2 com o MAC do next hop
    const forwardedPacket: SimPacket = {
      ...packet,
      layer2: {
        ...packet.layer2,
        srcMac: decision.outInterface.macAddress ?? node.data.macAddress,
        dstMac: arpEntry.macAddress,
      },
      currentNodeId: node.id,
    };

    // Encontrar o nó conectado e agendar movimento
    if (decision.outInterface.connectedEdgeId) {
      const nextHop = this.findConnectedNode(
        node.id,
        decision.outInterface.connectedEdgeId,
      );
      if (nextHop) {
        this.schedulePacketMove(
          node,
          nextHop.node,
          forwardedPacket,
          decision.outInterface,
          nextHop.edge,
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TICK LOOP & SCHEDULING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Loop principal de ticks — processa eventos agendados step by step.
   * Usa setTimeout recursivo para permitir que a UI renderize entre ticks.
   */
  private runTickLoop(
    sourceNode: NetworkNode,
    targetNode: NetworkNode,
    arpTargetIp: string,
    outInterface: NetworkInterface,
  ): void {
    const tickStep = () => {
      if (!this.state.isRunning) return;

      // Safety: limite máximo de ticks
      if (this.scheduler.getCurrentTick() >= this.maxTicks) {
        this.addLog(
          "error",
          "Engine",
          "Simulação excedeu limite máximo de ticks",
        );
        this.completeSimulation(
          false,
          [],
          "Timeout — simulação excedeu limite de ticks",
        );
        return;
      }

      const events = this.scheduler.tick();
      this.state.currentTick = this.scheduler.getCurrentTick();

      // Processar cada evento
      for (const event of events) {
        this.handleScheduledEvent(event);
      }

      // Aging de tabelas a cada 10 ticks
      if (this.state.currentTick % 10 === 0) {
        this.deviceStates.ageAll(this.state.currentTick);
      }

      // Continuar se há eventos pendentes ou pacotes ativos
      if (!this.scheduler.isEmpty() || this.state.activePackets.length > 0) {
        const delay = this.scheduler.getAnimationDurationMs();
        setTimeout(tickStep, Math.max(50, delay / 2));
      } else if (
        this.pendingARPQueue.size === 0 &&
        this.state.deliveredPackets.length === 0
      ) {
        // Nenhum pacote entregue e nada pendente — timeout
        setTimeout(() => {
          if (
            this.state.isRunning &&
            this.state.deliveredPackets.length === 0
          ) {
            this.completeSimulation(false, [], "Nenhuma resposta recebida");
          }
        }, this.scheduler.getAnimationDurationMs() * 3);
      }
    };

    // Iniciar primeiro tick
    const delay = this.scheduler.getAnimationDurationMs();
    setTimeout(tickStep, Math.max(50, delay));
  }

  /**
   * Processar um evento agendado do scheduler.
   */
  private handleScheduledEvent(event: ScheduledEvent): void {
    switch (event.type) {
      case "packet-forward": {
        if (!event.packet) return;

        const targetNodeId = event.data?.["targetNodeId"] as string | undefined;
        const ingressIfaceId = event.data?.["ingressInterfaceId"] as
          | string
          | undefined;

        if (!targetNodeId) return;

        const targetNode = this.nodes.find((n) => n.id === targetNodeId);
        if (!targetNode) return;

        const ingressIface = ingressIfaceId
          ? targetNode.data.interfaces.find((i) => i.id === ingressIfaceId)
          : null;

        // Remover dos pacotes ativos
        this.state.activePackets = this.state.activePackets.filter(
          (p) => p.id !== event.packet!.id,
        );

        // Processar pacote no nó de destino
        this.processPacketAtNode(
          targetNode,
          event.packet,
          ingressIface ?? null,
        );
        break;
      }

      case "sim-complete": {
        this.completeSimulation(true, []);
        break;
      }
    }
  }

  /**
   * Agendar movimento visual de um pacote entre dois nós.
   */
  private schedulePacketMove(
    fromNode: NetworkNode,
    toNode: NetworkNode,
    packet: SimPacket,
    outInterface: NetworkInterface,
    edge: Edge,
  ): void {
    // Encontrar a interface de ingress no nó de destino
    const ingressIfaceId = this.findIngressInterface(toNode, edge);

    // Adicionar aos pacotes ativos
    this.state.activePackets.push(packet);

    // Emitir evento de movimento (para animação na UI)
    const animDuration = this.scheduler.getAnimationDurationMs();
    this.eventBus.emit("packet:move", {
      packet,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      edgeId: edge.id,
      animationDurationMs: animDuration,
    });

    // Agendar a chegada
    this.scheduler.schedule(
      "packet-forward",
      Math.max(1, Math.ceil(animDuration / 100)),
      packet,
      {
        targetNodeId: toNode.id,
        ingressInterfaceId: ingressIfaceId,
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ARP PENDING QUEUE
  // ═══════════════════════════════════════════════════════════════════════

  /** Enfileirar pacote esperando ARP resolution */
  private enqueuePendingARP(targetIp: string, packet: SimPacket): void {
    const queue = this.pendingARPQueue.get(targetIp) ?? [];
    queue.push(packet);
    this.pendingARPQueue.set(targetIp, queue);
  }

  /** Verificar se ARP foi resolvido e despachar pacotes pendentes */
  private checkPendingARPQueue(
    node: NetworkNode,
    resolvedIp: string,
    resolvedMac: string,
  ): void {
    const pending = this.pendingARPQueue.get(resolvedIp);
    if (!pending || pending.length === 0) {
      // Se não há pacotes pendentes no mapa, é possivelmente o fluxo inicial.
      // Neste caso, a resolução ARP completou e precisamos iniciar o ICMP.
      // O ping em curso vai detectar isso via a flag `pingResolve`.
      if (this.pingResolve) {
        // Encontrar interface de saída do nó e iniciar ICMP flow
        const outIface = this.findBestInterface(node, resolvedIp);
        if (outIface) {
          // Encontrar o targetNode original pelo IP destino
          const targetNode = this.nodes.find(
            (n) =>
              n.data.ipAddress === this.getOriginalPingTargetIp() ||
              n.data.interfaces.some(
                (i) => i.ipConfig?.address === this.getOriginalPingTargetIp(),
              ),
          );

          if (targetNode) {
            const summary = this.startICMPFlowAsync(
              node,
              targetNode,
              resolvedMac,
              outIface,
            );
            return;
          }
        }
      }
      return;
    }

    this.pendingARPQueue.delete(resolvedIp);

    this.addLog(
      "info",
      node.data.label,
      `ARP resolvido para ${resolvedIp} — despachando ${pending.length} pacote(s) pendente(s)`,
    );

    for (const packet of pending) {
      // Reescrever L2 com o MAC resolvido
      const updatedPacket: SimPacket = {
        ...packet,
        layer2: {
          ...packet.layer2,
          dstMac: resolvedMac,
        },
      };

      this.routeAndForward(node, updatedPacket);
    }
  }

  // Armazenar o IP de destino original do ping para referência
  private originalPingTargetIp: string | null = null;

  private getOriginalPingTargetIp(): string | null {
    return this.originalPingTargetIp;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ICMP FLOW
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Iniciar fluxo ICMP (quando ARP já foi resolvido).
   * Versão síncrona para uso quando ARP hit no cache.
   */
  private async startICMPFlow(
    sourceNode: NetworkNode,
    targetNode: NetworkNode,
    dstMac: string,
    outInterface: NetworkInterface,
  ): Promise<SimulationSummary> {
    this.originalPingTargetIp = targetNode.data.ipAddress;

    return new Promise<SimulationSummary>((resolve) => {
      this.pingResolve = resolve;

      const result = this.icmpService.createPing({
        sourceNode,
        targetIp: targetNode.data.ipAddress,
        targetNodeId: targetNode.id,
        dstMac,
        outInterface,
      });
      this.state.logs.push(...result.logs);

      if (!result.success) {
        this.completeSimulation(false, [], "Falha ao criar pacote ICMP");
        return;
      }

      // Encaminhar pacote ICMP
      for (const packet of result.packets) {
        this.routeAndForward(sourceNode, packet);
      }

      // Iniciar tick loop
      this.runTickLoop(
        sourceNode,
        targetNode,
        targetNode.data.ipAddress,
        outInterface,
      );
    });
  }

  /**
   * Versão async do startICMPFlow (chamada quando ARP resolve depois).
   */
  private startICMPFlowAsync(
    sourceNode: NetworkNode,
    targetNode: NetworkNode,
    dstMac: string,
    outInterface: NetworkInterface,
  ): void {
    this.originalPingTargetIp = targetNode.data.ipAddress;

    const result = this.icmpService.createPing({
      sourceNode,
      targetIp: targetNode.data.ipAddress,
      targetNodeId: targetNode.id,
      dstMac,
      outInterface,
    });
    this.state.logs.push(...result.logs);

    if (!result.success) {
      this.completeSimulation(false, [], "Falha ao criar pacote ICMP");
      return;
    }

    for (const packet of result.packets) {
      this.routeAndForward(sourceNode, packet);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TTL HANDLING
  // ═══════════════════════════════════════════════════════════════════════

  private handleTTLExpired(
    node: NetworkNode,
    packet: SimPacket,
    ingressInterface: NetworkInterface | null,
  ): void {
    const outIface =
      ingressInterface ?? node.data.interfaces.find((i) => i.adminUp) ?? null;

    this.eventBus.emit("packet:drop", {
      packet,
      atNodeId: node.id,
      reason: "ttl-expired",
      explanation: `TTL expirou no ${node.data.label}`,
      ariaAnnouncement: `${node.data.label}: TTL do pacote chegou a zero. Pacote descartado.`,
    });
    this.state.droppedPackets.push({ packet, reason: "ttl-expired" });

    if (outIface) {
      const ttlResult = this.icmpService.generateTTLExceeded(
        node,
        packet,
        outIface,
      );
      this.state.logs.push(...ttlResult.logs);
      for (const p of ttlResult.packets) {
        this.routeAndForward(node, p);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPLETION & HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private completeSimulation(
    success: boolean,
    path: string[],
    errorMessage?: string,
  ): void {
    this.state.isRunning = false;

    const summary: SimulationSummary = {
      success,
      totalTicks: this.scheduler.getCurrentTick(),
      totalPackets:
        this.state.deliveredPackets.length +
        this.state.droppedPackets.length +
        this.state.activePackets.length,
      deliveredPackets: this.state.deliveredPackets.length,
      droppedPackets: this.state.droppedPackets.length,
      path,
      totalLatencyMs: this.scheduler.getCurrentTick() * 10, // Aproximação
      logs: [...this.state.logs],
      errors: errorMessage ? [errorMessage] : [],
    };

    this.eventBus.emit("sim:complete", summary);

    if (this.pingResolve) {
      this.pingResolve(summary);
      this.pingResolve = null;
    }
  }

  private createFailureSummary(errors: string[]): SimulationSummary {
    const summary: SimulationSummary = {
      success: false,
      totalTicks: 0,
      totalPackets: 0,
      deliveredPackets: 0,
      droppedPackets: 0,
      path: [],
      totalLatencyMs: 0,
      logs: [...this.state.logs],
      errors,
    };

    for (const error of errors) {
      this.addLog("error", "Engine", error);
    }

    this.eventBus.emit("sim:complete", summary);
    this.state.isRunning = false;

    if (this.pingResolve) {
      this.pingResolve(summary);
      this.pingResolve = null;
    }

    return summary;
  }

  private validatePingPrerequisites(
    source: NetworkNode,
    target: NetworkNode,
  ): string | null {
    if (source.data.status === "offline")
      return `${source.data.label} está offline`;
    if (target.data.status === "offline")
      return `${target.data.label} está offline`;
    if (!source.data.ipAddress)
      return `${source.data.label} não tem IP configurado`;
    if (!target.data.ipAddress)
      return `${target.data.label} não tem IP configurado`;
    if (source.data.linkStatus === "down")
      return `Link de ${source.data.label} está down`;

    // Verificar se tem pelo menos uma interface ativa e conectada
    const hasActiveInterface = source.data.interfaces.some(
      (i) => i.adminUp && i.connectedEdgeId,
    );
    if (source.data.interfaces.length > 0 && !hasActiveInterface) {
      return `${source.data.label} não tem nenhuma interface ativa e conectada`;
    }

    return null;
  }

  private findSourceOutInterface(
    sourceNode: NetworkNode,
    targetIp: string,
  ): NetworkInterface | null {
    // Tentar encontrar interface na mesma sub-rede
    for (const iface of sourceNode.data.interfaces) {
      if (!iface.adminUp || !iface.connectedEdgeId) continue;
      if (iface.ipConfig?.address && iface.ipConfig?.mask) {
        return iface;
      }
    }

    // Fallback: primeira interface conectada com IP
    return (
      sourceNode.data.interfaces.find((i) => i.adminUp && i.connectedEdgeId) ??
      null
    );
  }

  private findBestInterface(
    node: NetworkNode,
    targetIp: string,
  ): NetworkInterface | null {
    return (
      node.data.interfaces.find((i) => i.adminUp && i.connectedEdgeId) ?? null
    );
  }

  /**
   * Encontrar o nó conectado via uma edge específica.
   */
  private findConnectedNode(
    currentNodeId: string,
    edgeId: string,
  ): { node: NetworkNode; edge: Edge } | null {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge) return null;

    const otherNodeId =
      edge.source === currentNodeId ? edge.target : edge.source;
    const otherNode = this.nodes.find((n) => n.id === otherNodeId);

    if (!otherNode) return null;
    return { node: otherNode, edge };
  }

  /**
   * Encontrar a interface de ingress no nó destino para uma edge.
   */
  private findIngressInterface(node: NetworkNode, edge: Edge): string | null {
    // Buscar interface que está conectada a esta edge
    const iface = node.data.interfaces.find(
      (i) => i.connectedEdgeId === edge.id,
    );
    return iface?.id ?? null;
  }

  private resetState(): void {
    this.state = {
      activePackets: [],
      deliveredPackets: [],
      droppedPackets: [],
      logs: [],
      isRunning: false,
      currentTick: 0,
      speed: this.state.speed,
    };
    this.pendingARPQueue.clear();
    this.originalPingTargetIp = null;
    this.scheduler.reset();
  }

  private addLog(
    level: ConsoleLogEvent["level"],
    source: string,
    message: string,
    details?: string,
  ): void {
    const log: ConsoleLogEvent = {
      level,
      timestamp: Date.now(),
      source,
      message,
      details,
    };
    this.state.logs.push(log);
    this.eventBus.emit(
      `console:${level === "success" ? "log" : level}` as any,
      log,
    );
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────
export const simulationOrchestrator = new SimulationOrchestrator();
