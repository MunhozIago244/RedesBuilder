// ─── IP Address Utilities ───────────────────────────────────────────────────

/**
 * Converte um endereço IP em representação numérica (32-bit).
 */
export function ipToNumber(ip: string): number {
  if (!ip || !isValidIp(ip)) return 0;
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

/**
 * Converte um número de 32 bits para string IP.
 */
export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join(".");
}

/**
 * Valida se um string é um IPv4 válido.
 */
export function isValidIp(ip: string): boolean {
  if (!ip) return false;
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
  });
}

/**
 * Valida se uma máscara de sub-rede é válida.
 */
export function isValidSubnetMask(mask: string): boolean {
  if (!isValidIp(mask)) return false;
  const num = ipToNumber(mask);
  if (num === 0) return true;
  const inverted = ~num >>> 0;
  return (inverted & (inverted + 1)) === 0;
}

/**
 * Calcula o endereço de rede a partir de IP e máscara.
 */
export function getNetworkAddress(ip: string, mask: string): string {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  return numberToIp((ipNum & maskNum) >>> 0);
}

/**
 * Calcula o endereço de broadcast a partir de IP e máscara.
 */
export function getBroadcastAddress(ip: string, mask: string): string {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const invertedMask = ~maskNum >>> 0;
  return numberToIp((ipNum | invertedMask) >>> 0);
}

/**
 * Verifica se dois IPs estão na mesma sub-rede.
 */
export function isSameSubnet(
  ip1: string,
  mask1: string,
  ip2: string,
  mask2: string,
): boolean {
  if (
    !isValidIp(ip1) ||
    !isValidIp(ip2) ||
    !isValidIp(mask1) ||
    !isValidIp(mask2)
  ) {
    return false;
  }
  const net1 = getNetworkAddress(ip1, mask1);
  const net2 = getNetworkAddress(ip2, mask2);
  return net1 === net2 && mask1 === mask2;
}

/**
 * Converte CIDR para máscara de sub-rede.
 */
export function cidrToMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) return "255.255.255.0";
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  return numberToIp(mask);
}

/**
 * Converte máscara de sub-rede para CIDR.
 */
export function maskToCidr(mask: string): number {
  const num = ipToNumber(mask);
  let cidr = 0;
  let n = num;
  while (n) {
    cidr += n & 1;
    n >>>= 1;
  }
  return cidr;
}
