// ─── Routing Service ────────────────────────────────────────────────────────
// Serviço de roteamento L3 — decide por qual interface encaminhar um pacote.
//
// Suporta:
// - Rotas diretamente conectadas (auto-geradas quando interface tem IP + no shutdown)
// - Rotas estáticas (configuradas via CLI: ip route)
// - Longest Prefix Match (lookup correto)

import type { Node, Edge } from "reactflow";
import type { NetworkDeviceData, NetworkInterface } from "@/types/network";
import type {
  SimPacket,
  RouteEntry,
  ConsoleLogEvent,
} from "@/types/simulation";
import { SimEventBus } from "../core/eventBus";
import { DeviceStateManager } from "../core/deviceState";
import { getNetworkAddress, isValidIp, isSameSubnet } from "@/utils/ipUtils";

type NetworkNode = Node<NetworkDeviceData>;

/** Resultado de uma decisão de roteamento */
export interface RoutingDecision {
  /** Se o pacote pode ser encaminhado */
  canRoute: boolean;
  /** Interface de saída */
  outInterface: NetworkInterface | null;
  /** Next hop IP (para ARP resolution) */
  nextHopIp: string | null;
  /** Rota utilizada */
  matchedRoute: RouteEntry | null;
  /** Razão de falha */
  failReason: string | null;
  /** Logs gerados */
  logs: ConsoleLogEvent[];
}

/**
 * RoutingService — Decide como encaminhar pacotes IP.
 *
 * Hierarquia de decisão:
 * 1. O destino é para mim? (deliver locally)
 * 2. Tenho rota na tabela? (longest prefix match)
 * 3. Tenho default route? (0.0.0.0/0)
 * 4. Sem rota → Destination Unreachable
 */
export class RoutingService {
  private eventBus: SimEventBus;
  private deviceStates: DeviceStateManager;

  constructor(eventBus: SimEventBus, deviceStates: DeviceStateManager) {
    this.eventBus = eventBus;
    this.deviceStates = deviceStates;
  }

  /**
   * Inicializar rotas diretamente conectadas para um dispositivo.
   * Deve ser chamado ao iniciar a simulação e quando interfaces mudam.
   */
  initializeConnectedRoutes(node: NetworkNode): void {
    if (!this.deviceStates.isL3Device(node.data.deviceType)) return;

    const state = this.deviceStates.getOrCreate(node.id, node.data.deviceType);

    // Limpar rotas conectadas anteriores e recriar
    const staticRoutes = state.routingTable
      .getAll()
      .filter((r) => r.type === "static");
    state.routingTable.clear();

    // Adicionar de volta rotas estáticas
    for (const route of staticRoutes) {
      if (route.nextHop) {
        state.routingTable.addStaticRoute(
          route.network,
          route.mask,
          route.nextHop,
          route.outInterface,
        );
      }
    }

    // Gerar rotas conectadas a partir de interfaces ativas com IP
    for (const iface of node.data.interfaces) {
      if (!iface.adminUp) continue;
      if (!iface.ipConfig?.address || !iface.ipConfig?.mask) continue;
      if (!isValidIp(iface.ipConfig.address) || !isValidIp(iface.ipConfig.mask))
        continue;

      const network = getNetworkAddress(
        iface.ipConfig.address,
        iface.ipConfig.mask,
      );
      state.routingTable.addConnectedRoute(
        network,
        iface.ipConfig.mask,
        iface.id,
      );
    }

    // Para end devices (PC, Laptop, etc.), adicionar default route via gateway
    const isEndDevice = [
      "pc",
      "laptop",
      "server",
      "printer",
      "ip-phone",
    ].includes(node.data.deviceType);
    if (
      isEndDevice &&
      node.data.gateway &&
      isValidIp(node.data.gateway) &&
      node.data.gateway !== "0.0.0.0"
    ) {
      state.routingTable.addStaticRoute(
        "0.0.0.0",
        "0.0.0.0",
        node.data.gateway,
      );
    }
  }

  /**
   * Tomar decisão de roteamento para um pacote IP.
   */
  routePacket(
    routerNode: NetworkNode,
    packet: SimPacket,
    nodes: NetworkNode[],
    edges: Edge[],
  ): RoutingDecision {
    const logs: ConsoleLogEvent[] = [];
    const destIp = packet.layer3.dstIp;

    // 1. Verificar se o pacote é para nós (delivery local)
    if (this.isPacketForMe(routerNode, destIp)) {
      logs.push(
        this.createLog(
          "info",
          routerNode.data.label,
          `Routing: Pacote para ${destIp} é destinado a este dispositivo (entrega local)`,
        ),
      );
      return {
        canRoute: true,
        outInterface: null, // delivery local
        nextHopIp: null,
        matchedRoute: null,
        failReason: null,
        logs,
      };
    }

    // 2. Verificar se o dispositivo faz roteamento
    if (!this.deviceStates.isL3Device(routerNode.data.deviceType)) {
      logs.push(
        this.createLog(
          "error",
          routerNode.data.label,
          `Routing: Dispositivo ${routerNode.data.deviceType} não faz roteamento L3`,
        ),
      );
      return {
        canRoute: false,
        outInterface: null,
        nextHopIp: null,
        matchedRoute: null,
        failReason: "Dispositivo não faz roteamento",
        logs,
      };
    }

    const state = this.deviceStates.getOrCreate(
      routerNode.id,
      routerNode.data.deviceType,
    );

    // 3. Lookup na tabela de roteamento (Longest Prefix Match)
    const route = state.routingTable.lookup(destIp);

    if (!route) {
      logs.push(
        this.createLog(
          "error",
          routerNode.data.label,
          `Routing: Sem rota para ${destIp} — Destination Unreachable`,
          "show ip route para ver a tabela de roteamento",
        ),
      );

      this.eventBus.emit("announce", {
        message: `${routerNode.data.label}: Sem rota para ${destIp}. Pacote descartado.`,
        priority: "assertive",
      });

      return {
        canRoute: false,
        outInterface: null,
        nextHopIp: null,
        matchedRoute: null,
        failReason: `No route to host ${destIp}`,
        logs,
      };
    }

    // 4. Encontrar interface de saída
    const outInterface = this.findOutInterface(
      routerNode,
      route,
      destIp,
      edges,
      nodes,
    );
    if (!outInterface) {
      logs.push(
        this.createLog(
          "error",
          routerNode.data.label,
          `Routing: Rota encontrada mas interface de saída ${route.outInterface} não disponível`,
        ),
      );
      return {
        canRoute: false,
        outInterface: null,
        nextHopIp: null,
        matchedRoute: route,
        failReason: "Interface de saída indisponível",
        logs,
      };
    }

    // 5. Verificar se interface está up
    if (!outInterface.adminUp) {
      logs.push(
        this.createLog(
          "error",
          routerNode.data.label,
          `Routing: Interface ${outInterface.shortName} está em shutdown`,
        ),
      );

      this.eventBus.emit("packet:drop", {
        packet,
        atNodeId: routerNode.id,
        reason: "port-down",
        explanation: `Interface ${outInterface.shortName} está administratively down`,
        ariaAnnouncement: `${routerNode.data.label}: Pacote descartado porque a interface ${outInterface.shortName} está desligada`,
      });

      return {
        canRoute: false,
        outInterface,
        nextHopIp: null,
        matchedRoute: route,
        failReason: `Interface ${outInterface.shortName} is shutdown`,
        logs,
      };
    }

    // 6. Determinar next hop IP
    const nextHopIp = route.nextHop ?? destIp; // Se connected, next hop é o próprio destino

    const routeTypeLabel = route.type === "connected" ? "C" : "S";
    logs.push(
      this.createLog(
        "info",
        routerNode.data.label,
        `Routing: [${routeTypeLabel}] ${route.network}/${route.prefixLength} → ${route.nextHop ?? "directly connected"} via ${outInterface.shortName}`,
        `Next hop: ${nextHopIp}`,
      ),
    );

    return {
      canRoute: true,
      outInterface,
      nextHopIp,
      matchedRoute: route,
      failReason: null,
      logs,
    };
  }

  /**
   * Verificar se um IP é de um dos nossos interfaces.
   */
  isPacketForMe(node: NetworkNode, destIp: string): boolean {
    // Verificar IP global do dispositivo
    if (node.data.ipAddress === destIp) return true;

    // Verificar IPs das interfaces
    for (const iface of node.data.interfaces) {
      if (iface.ipConfig?.address === destIp) return true;
    }

    return false;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Encontrar a interface de saída real para encaminhar o pacote.
   * Se a rota especifica uma interface, usa ela.
   * Senão, resolve pelo next hop.
   */
  private findOutInterface(
    node: NetworkNode,
    route: RouteEntry,
    destIp: string,
    edges: Edge[],
    nodes: NetworkNode[],
  ): NetworkInterface | null {
    // Se a rota especifica uma interface, usar diretamente
    if (route.outInterface) {
      const iface = node.data.interfaces.find(
        (i) => i.id === route.outInterface,
      );
      if (iface) return iface;
    }

    // Tentar encontrar interface na mesma sub-rede que o next hop
    const targetIp = route.nextHop ?? destIp;
    for (const iface of node.data.interfaces) {
      if (!iface.adminUp || !iface.connectedEdgeId) continue;
      if (!iface.ipConfig?.address || !iface.ipConfig?.mask) continue;

      if (
        isSameSubnet(
          iface.ipConfig.address,
          iface.ipConfig.mask,
          targetIp,
          iface.ipConfig.mask,
        )
      ) {
        return iface;
      }
    }

    // Fallback: primeira interface conectada e ativa
    return (
      node.data.interfaces.find((i) => i.adminUp && i.connectedEdgeId) ?? null
    );
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
