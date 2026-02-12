// ─── CLI Engine — Parser de Comandos IOS-like ───────────────────────────────
// State machine pura (sem dependências React).
// Modos: user > privileged > config > config-if
// Integra com o estado real do dispositivo via callbacks.

import type {
  CliMode,
  CliState,
  NetworkInterface,
  NetworkDeviceData,
} from "@/types/network";
import type { RouteEntry } from "@/types/simulation";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CliContext {
  /** Dados atuais do dispositivo */
  deviceData: NetworkDeviceData;
  /** Callback para atualizar dados do dispositivo no store */
  onUpdateData: (data: Partial<NetworkDeviceData>) => void;
  /** Callback para atualizar uma interface específica */
  onUpdateInterface: (
    interfaceId: string,
    data: Partial<NetworkInterface>,
  ) => void;
  /** Callback para adicionar rota estática (ip route) */
  onAddStaticRoute?: (network: string, mask: string, nextHop: string) => void;
  /** Callback para remover rota estática (no ip route) */
  onRemoveStaticRoute?: (
    network: string,
    mask: string,
    nextHop: string,
  ) => void;
  /** Callback para obter tabela de rotas */
  getRoutes?: () => RouteEntry[];
  /** Callback para salvar config (write memory) */
  onSaveConfig?: () => void;
}

export interface CliResult {
  output: string[];
  newState: CliState;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

export function buildPrompt(state: CliState): string {
  const host = state.hostname;
  switch (state.mode) {
    case "user":
      return `${host}>`;
    case "privileged":
      return `${host}#`;
    case "config":
      return `${host}(config)#`;
    case "config-if":
      return `${host}(config-if)#`;
  }
}

// ─── Command Parser ─────────────────────────────────────────────────────────

export function createInitialCliState(hostname?: string): CliState {
  return {
    hostname: hostname ?? "Router",
    mode: "user",
    currentInterface: null,
    history: [],
    output: [
      "╔══════════════════════════════════════════════════╗",
      "║        NetBuilder Academy — CLI Emulator         ║",
      "║   Digite 'help' para ver os comandos disponíveis ║",
      "╚══════════════════════════════════════════════════╝",
      "",
    ],
  };
}

/**
 * Processa um comando e retorna o novo estado + output.
 * Função pura — todo side-effect é delegado via callbacks no CliContext.
 */
export function processCommand(
  input: string,
  state: CliState,
  context: CliContext,
): CliResult {
  const trimmed = input.trim();
  const newHistory = [...state.history, trimmed];

  // Prompt line na saída
  const promptLine = `${buildPrompt(state)} ${trimmed}`;

  if (!trimmed) {
    return {
      output: [...state.output, promptLine],
      newState: { ...state, history: newHistory },
    };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Dispatch baseado no modo atual
  switch (state.mode) {
    case "user":
      return handleUserMode(cmd, args, state, context, promptLine, newHistory);
    case "privileged":
      return handlePrivilegedMode(
        cmd,
        args,
        state,
        context,
        promptLine,
        newHistory,
      );
    case "config":
      return handleConfigMode(
        cmd,
        args,
        state,
        context,
        promptLine,
        newHistory,
      );
    case "config-if":
      return handleConfigIfMode(
        cmd,
        args,
        state,
        context,
        promptLine,
        newHistory,
      );
  }
}

// ─── User Mode ──────────────────────────────────────────────────────────────

function handleUserMode(
  cmd: string,
  _args: string[],
  state: CliState,
  _context: CliContext,
  promptLine: string,
  history: string[],
): CliResult {
  switch (cmd) {
    case "enable":
    case "en":
      return result(state, history, promptLine, [], "privileged");

    case "help":
    case "?":
      return result(state, history, promptLine, [
        "Comandos disponíveis (modo USER):",
        "  enable       Entrar no modo privilegiado",
        "  help         Mostrar esta ajuda",
        "  exit         Sair do terminal",
      ]);

    case "exit":
    case "quit":
      return result(state, history, promptLine, ["--- Terminal fechado ---"]);

    default:
      return result(state, history, promptLine, [
        `% Comando não reconhecido: '${cmd}'`,
        "  Digite 'help' para ver os comandos disponíveis.",
      ]);
  }
}

// ─── Privileged Mode ────────────────────────────────────────────────────────

function handlePrivilegedMode(
  cmd: string,
  args: string[],
  state: CliState,
  context: CliContext,
  promptLine: string,
  history: string[],
): CliResult {
  switch (cmd) {
    case "configure":
    case "conf": {
      const sub = args[0]?.toLowerCase();
      if (sub === "terminal" || sub === "t") {
        return result(
          state,
          history,
          promptLine,
          ["Enter configuration commands, one per line. End with 'exit'."],
          "config",
        );
      }
      return result(state, history, promptLine, ["% Uso: configure terminal"]);
    }

    case "show": {
      return handleShow(args, state, context, promptLine, history);
    }

    case "ping": {
      const dest = args[0];
      if (!dest) {
        return result(state, history, promptLine, ["% Uso: ping <ip-address>"]);
      }
      return result(state, history, promptLine, [
        `Sending 5, 100-byte ICMP Echos to ${dest}, timeout is 2 seconds:`,
        "!!!!!",
        `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
      ]);
    }

    case "write": {
      const sub = args[0]?.toLowerCase();
      if (!sub || sub === "memory" || sub === "mem") {
        if (context.onSaveConfig) {
          context.onSaveConfig();
          return result(state, history, promptLine, [
            "Building configuration...",
            "[OK]",
          ]);
        }
        return result(state, history, promptLine, [
          "Building configuration...",
          "[OK] (nota: persistência virtual não inicializada)",
        ]);
      }
      return result(state, history, promptLine, ["% Uso: write memory"]);
    }

    case "copy": {
      const src = args[0]?.toLowerCase();
      const dst = args[1]?.toLowerCase();
      if (
        (src === "running-config" || src === "run") &&
        (dst === "startup-config" || dst === "start")
      ) {
        if (context.onSaveConfig) {
          context.onSaveConfig();
        }
        return result(state, history, promptLine, [
          "Destination filename [startup-config]?",
          "Building configuration...",
          "[OK]",
        ]);
      }
      return result(state, history, promptLine, [
        "% Uso: copy running-config startup-config",
      ]);
    }

    case "disable":
      return result(state, history, promptLine, [], "user");

    case "exit":
    case "quit":
      return result(state, history, promptLine, [], "user");

    case "help":
    case "?":
      return result(state, history, promptLine, [
        "Comandos disponíveis (modo PRIVILEGIADO):",
        "  configure terminal       Entrar no modo de configuração",
        "  show ip interface brief  Ver resumo das interfaces",
        "  show ip route            Ver tabela de roteamento",
        "  show running-config      Ver configuração atual",
        "  show interfaces          Ver detalhes das interfaces",
        "  ping <ip>                Testar conectividade",
        "  write memory             Salvar configuração",
        "  copy run start           Copiar running → startup config",
        "  disable                  Voltar ao modo user",
        "  exit                     Voltar ao modo user",
      ]);

    default:
      return result(state, history, promptLine, [
        `% Comando não reconhecido: '${cmd}'`,
      ]);
  }
}

// ─── Config Mode ────────────────────────────────────────────────────────────

function handleConfigMode(
  cmd: string,
  args: string[],
  state: CliState,
  context: CliContext,
  promptLine: string,
  history: string[],
): CliResult {
  switch (cmd) {
    case "hostname": {
      const newName = args[0];
      if (!newName) {
        return result(state, history, promptLine, ["% Uso: hostname <nome>"]);
      }
      return {
        output: [...state.output, promptLine],
        newState: {
          ...state,
          hostname: newName,
          mode: "config",
          history,
        },
      };
    }

    case "ip": {
      const sub = args[0]?.toLowerCase();
      if (sub === "route") {
        // ip route <network> <mask> <next-hop>
        const network = args[1];
        const mask = args[2];
        const nextHop = args[3];
        if (!network || !mask || !nextHop) {
          return result(state, history, promptLine, [
            "% Uso: ip route <network> <mask> <next-hop>",
            "  Ex: ip route 10.0.0.0 255.255.255.0 192.168.1.1",
          ]);
        }
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (
          !ipRegex.test(network) ||
          !ipRegex.test(mask) ||
          !ipRegex.test(nextHop)
        ) {
          return result(state, history, promptLine, [
            "% Endereço de rede, máscara ou next-hop em formato inválido.",
          ]);
        }
        if (context.onAddStaticRoute) {
          context.onAddStaticRoute(network, mask, nextHop);
          return result(state, history, promptLine, []);
        }
        return result(state, history, promptLine, [
          "% Roteamento estático não disponível neste dispositivo.",
        ]);
      }
      return result(state, history, promptLine, [
        "% Subcomando IP não reconhecido no modo config.",
        "  Uso: ip route <network> <mask> <next-hop>",
      ]);
    }

    case "no": {
      const sub = args[0]?.toLowerCase();
      if (sub === "ip" && args[1]?.toLowerCase() === "route") {
        const network = args[2];
        const mask = args[3];
        const nextHop = args[4];
        if (!network || !mask || !nextHop) {
          return result(state, history, promptLine, [
            "% Uso: no ip route <network> <mask> <next-hop>",
          ]);
        }
        if (context.onRemoveStaticRoute) {
          context.onRemoveStaticRoute(network, mask, nextHop);
          return result(state, history, promptLine, []);
        }
        return result(state, history, promptLine, [
          "% Roteamento estático não disponível neste dispositivo.",
        ]);
      }
      return result(state, history, promptLine, [
        `% Subcomando 'no ${sub}' não reconhecido no modo config.`,
      ]);
    }

    case "interface":
    case "int": {
      const ifName = args.join(" ");
      if (!ifName) {
        return result(state, history, promptLine, [
          "% Uso: interface <nome>",
          "  Ex: interface GigabitEthernet0/0",
        ]);
      }

      // Encontrar interface pelo nome completo ou abreviado
      const iface = findInterface(context.deviceData.interfaces, ifName);
      if (!iface) {
        return result(state, history, promptLine, [
          `% Interface '${ifName}' não encontrada.`,
          "  Use 'show ip interface brief' para ver as interfaces disponíveis.",
        ]);
      }

      return {
        output: [...state.output, promptLine],
        newState: {
          ...state,
          mode: "config-if",
          currentInterface: iface.id,
          history,
        },
      };
    }

    case "exit":
    case "end":
      return result(state, history, promptLine, [], "privileged");

    case "help":
    case "?":
      return result(state, history, promptLine, [
        "Comandos disponíveis (modo CONFIG):",
        "  hostname <nome>              Definir hostname do dispositivo",
        "  interface <nome>             Entrar na configuração de interface",
        "  ip route <net> <mask> <nh>   Adicionar rota estática",
        "  no ip route <net> <mask> <nh>  Remover rota estática",
        "  exit                         Voltar ao modo privilegiado",
      ]);

    default:
      return result(state, history, promptLine, [
        `% Comando não reconhecido: '${cmd}'`,
      ]);
  }
}

// ─── Config-If Mode ─────────────────────────────────────────────────────────

function handleConfigIfMode(
  cmd: string,
  args: string[],
  state: CliState,
  context: CliContext,
  promptLine: string,
  history: string[],
): CliResult {
  const iface = context.deviceData.interfaces.find(
    (i) => i.id === state.currentInterface,
  );
  if (!iface) {
    return result(
      state,
      history,
      promptLine,
      ["% Erro: interface não encontrada no dispositivo."],
      "config",
    );
  }

  switch (cmd) {
    case "ip": {
      const sub = args[0]?.toLowerCase();
      if (sub === "address") {
        const address = args[1];
        const mask = args[2];
        if (!address || !mask) {
          return result(state, history, promptLine, [
            "% Uso: ip address <ip> <máscara>",
            "  Ex: ip address 192.168.1.1 255.255.255.0",
          ]);
        }

        // Validação básica de formato IP
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(address) || !ipRegex.test(mask)) {
          return result(state, history, promptLine, [
            "% Endereço IP ou máscara em formato inválido.",
          ]);
        }

        // Aplicar via callback
        context.onUpdateInterface(iface.id, {
          ipConfig: { address, mask },
        });

        return result(state, history, promptLine, []);
      }
      return result(state, history, promptLine, [
        "% Subcomando IP não reconhecido. Uso: ip address <ip> <mask>",
      ]);
    }

    case "no": {
      const sub = args[0]?.toLowerCase();
      if (sub === "shutdown") {
        context.onUpdateInterface(iface.id, { adminUp: true });
        return result(state, history, promptLine, []);
      }
      if (sub === "ip" && args[1]?.toLowerCase() === "address") {
        context.onUpdateInterface(iface.id, { ipConfig: undefined });
        return result(state, history, promptLine, []);
      }
      return result(state, history, promptLine, [
        `% Subcomando 'no ${sub}' não reconhecido.`,
      ]);
    }

    case "shutdown":
      context.onUpdateInterface(iface.id, { adminUp: false });
      return result(state, history, promptLine, []);

    case "description":
    case "desc":
      // Decorativo — apenas imprime confirmação
      return result(state, history, promptLine, []);

    case "exit":
      return {
        output: [...state.output, promptLine],
        newState: {
          ...state,
          mode: "config",
          currentInterface: null,
          history,
        },
      };

    case "help":
    case "?":
      return result(state, history, promptLine, [
        `Comandos disponíveis (config-if: ${iface.shortName}):`,
        "  ip address <ip> <mask>  Definir endereço IP",
        "  no ip address           Remover endereço IP",
        "  shutdown                Desabilitar interface",
        "  no shutdown             Habilitar interface",
        "  exit                    Voltar ao modo config",
      ]);

    default:
      return result(state, history, promptLine, [
        `% Comando não reconhecido: '${cmd}'`,
      ]);
  }
}

// ─── Show Commands ──────────────────────────────────────────────────────────

function handleShow(
  args: string[],
  state: CliState,
  context: CliContext,
  promptLine: string,
  history: string[],
): CliResult {
  const sub = args.join(" ").toLowerCase();

  if (
    sub === "ip interface brief" ||
    sub === "ip int brief" ||
    sub === "ip int br"
  ) {
    const lines = formatIpInterfaceBrief(context.deviceData);
    return result(state, history, promptLine, lines);
  }

  if (sub === "interfaces" || sub === "int") {
    const lines = formatInterfacesDetail(context.deviceData);
    return result(state, history, promptLine, lines);
  }

  if (sub === "running-config" || sub === "run") {
    const lines = formatRunningConfig(state, context.deviceData, context);
    return result(state, history, promptLine, lines);
  }

  if (sub === "ip route" || sub === "ip ro") {
    const lines = formatIpRoute(context);
    return result(state, history, promptLine, lines);
  }

  if (sub === "version" || sub === "ver") {
    return result(state, history, promptLine, [
      `NetBuilder Academy Virtual ${context.deviceData.deviceType}`,
      `Hostname: ${state.hostname}`,
      `Model: ${context.deviceData.hardwareModel ?? "Generic"}`,
      `Interfaces: ${context.deviceData.interfaces.length}`,
    ]);
  }

  return result(state, history, promptLine, [
    "% Subcomando show não reconhecido.",
    "  show ip interface brief | show ip route | show interfaces | show running-config | show version",
  ]);
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function formatIpInterfaceBrief(data: NetworkDeviceData): string[] {
  const header =
    "Interface                  IP-Address      OK? Method Status                Protocol";
  const separator = "─".repeat(header.length);

  const lines = data.interfaces.map((iface) => {
    const name = iface.name.padEnd(27);
    const ip = (iface.ipConfig?.address ?? "unassigned").padEnd(16);
    const ok = "YES".padEnd(4);
    const method = "manual".padEnd(7);
    const status = iface.adminUp
      ? (iface.connectedEdgeId ? "up" : "down").padEnd(22)
      : "administratively down ".padEnd(22);
    const protocol = iface.adminUp && iface.connectedEdgeId ? "up" : "down";

    return `${name}${ip}${ok}${method}${status}${protocol}`;
  });

  return [header, separator, ...lines];
}

function formatInterfacesDetail(data: NetworkDeviceData): string[] {
  const lines: string[] = [];

  for (const iface of data.interfaces) {
    lines.push(
      `${iface.name} is ${iface.adminUp ? "up" : "administratively down"}, line protocol is ${iface.adminUp && iface.connectedEdgeId ? "up" : "down"}`,
    );
    lines.push(
      `  Hardware is ${iface.type.toUpperCase()}, address is ${iface.macAddress}`,
    );
    if (iface.ipConfig) {
      lines.push(
        `  Internet address is ${iface.ipConfig.address}/${iface.ipConfig.mask}`,
      );
    }
    lines.push(`  MTU 1500 bytes, BW ${formatSpeed(iface.speed)}, DLY 10 usec`);
    lines.push(
      `  ${iface.poe !== "none" ? `PoE: ${iface.poe === "in" ? "powered" : "supplying"}` : ""}`,
    );
    lines.push("");
  }

  return lines;
}

function formatIpRoute(context: CliContext): string[] {
  const routes = context.getRoutes?.() ?? [];
  if (routes.length === 0) {
    return [
      "Codes: C - connected, S - static",
      "",
      "Gateway of last resort is not set.",
      "",
      "  (nenhuma rota configurada)",
    ];
  }

  const lines: string[] = ["Codes: C - connected, S - static, L - local", ""];

  for (const route of routes) {
    const code =
      route.type === "connected" ? "C" : route.type === "static" ? "S" : "L";
    const prefix = `${route.network}/${route.mask}`;
    const via = route.nextHop
      ? `via ${route.nextHop}`
      : route.outInterface
        ? `directly connected, ${route.outInterface}`
        : "";
    const metric =
      route.metric > 0 ? ` [${route.adminDistance}/${route.metric}]` : "";
    lines.push(`${code}    ${prefix} ${via}${metric}`);
  }

  return lines;
}

function formatRunningConfig(
  state: CliState,
  data: NetworkDeviceData,
  context?: CliContext,
): string[] {
  const lines: string[] = [
    "Building configuration...",
    "",
    "Current configuration:",
    "!",
    `hostname ${state.hostname}`,
    "!",
  ];

  for (const iface of data.interfaces) {
    lines.push(`interface ${iface.name}`);
    if (iface.ipConfig) {
      lines.push(
        ` ip address ${iface.ipConfig.address} ${iface.ipConfig.mask}`,
      );
    }
    if (!iface.adminUp) {
      lines.push(" shutdown");
    }
    lines.push("!");
  }

  // Rotas estáticas no running-config
  const routes = context?.getRoutes?.() ?? [];
  const staticRoutes = routes.filter((r) => r.type === "static");
  if (staticRoutes.length > 0) {
    for (const route of staticRoutes) {
      lines.push(
        `ip route ${route.network} ${route.mask} ${route.nextHop ?? ""}`,
      );
    }
    lines.push("!");
  }

  lines.push("", "end");
  return lines;
}

function formatSpeed(speed: string): string {
  const map: Record<string, string> = {
    "10M": "10000 Kbit",
    "100M": "100000 Kbit",
    "1G": "1000000 Kbit",
    "10G": "10000000 Kbit",
  };
  return map[speed] ?? speed;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findInterface(
  interfaces: NetworkInterface[],
  query: string,
): NetworkInterface | undefined {
  const q = query.toLowerCase().replace(/\s+/g, "");

  return interfaces.find((iface) => {
    const full = iface.name.toLowerCase().replace(/\s+/g, "");
    const short = iface.shortName.toLowerCase().replace(/\s+/g, "");
    return (
      full === q || short === q || full.startsWith(q) || short.startsWith(q)
    );
  });
}

function result(
  state: CliState,
  history: string[],
  promptLine: string,
  outputLines: string[],
  newMode?: CliMode,
): CliResult {
  return {
    output: [...state.output, promptLine, ...outputLines],
    newState: {
      ...state,
      mode: newMode ?? state.mode,
      history,
      currentInterface:
        newMode === "config" || newMode === "privileged" || newMode === "user"
          ? null
          : state.currentInterface,
    },
  };
}

// ─── Tab Completion ─────────────────────────────────────────────────────────

const COMMANDS_BY_MODE: Record<CliMode, string[]> = {
  user: ["enable", "help", "exit"],
  privileged: [
    "configure terminal",
    "show ip interface brief",
    "show ip route",
    "show interfaces",
    "show running-config",
    "show version",
    "ping",
    "write memory",
    "copy running-config startup-config",
    "disable",
    "exit",
    "help",
  ],
  config: [
    "hostname",
    "interface",
    "ip route",
    "no ip route",
    "exit",
    "end",
    "help",
  ],
  "config-if": [
    "ip address",
    "no ip address",
    "shutdown",
    "no shutdown",
    "description",
    "exit",
    "help",
  ],
};

export function getCompletions(partial: string, mode: CliMode): string[] {
  const q = partial.toLowerCase();
  return COMMANDS_BY_MODE[mode].filter((c) => c.startsWith(q));
}
