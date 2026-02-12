// ─── MAC Address Generator ──────────────────────────────────────────────────

const OUI_PREFIXES: Record<string, string> = {
  router: "00:1A:2B",
  "switch-l2": "00:2C:3D",
  "switch-l3": "00:2C:4E",
  "access-point": "00:3E:5F",
  pc: "00:4F:6A",
  laptop: "00:5A:7B",
  "ip-phone": "00:6B:8C",
  server: "00:7C:9D",
  printer: "00:8D:AE",
  isp: "00:9E:BF",
  cloud: "00:AF:C0",
  firewall: "00:BF:D1",
};

function randomHexByte(): string {
  return Math.floor(Math.random() * 256)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

/**
 * Gera um endereço MAC único baseado no tipo de dispositivo.
 * Usa um prefixo OUI fictício para cada categoria.
 */
export function generateMacAddress(deviceType: string): string {
  const prefix = OUI_PREFIXES[deviceType] ?? "00:00:00";
  return `${prefix}:${randomHexByte()}:${randomHexByte()}:${randomHexByte()}`;
}

/**
 * Formata um MAC address para exibição compacta.
 */
export function formatMac(mac: string): string {
  return mac.toUpperCase();
}

/**
 * Gera um ID único para nós do grafo.
 */
export function generateNodeId(deviceType: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${deviceType}-${timestamp}-${random}`;
}
