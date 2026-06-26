import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_DNS_LOOKUPS = 8;

export function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function isBlockedHostnameLiteral(hostname: string): boolean {
  const lowered = hostname.trim().toLowerCase();
  if (!lowered) {
    return true;
  }

  if (lowered === "localhost" || lowered.endsWith(".local")) {
    return true;
  }

  const version = isIP(lowered);
  if (version === 4) {
    return isPrivateIpv4(lowered);
  }

  if (version === 6) {
    return isPrivateIpv6(lowered);
  }

  return false;
}

export async function isSafeOutboundUrl(url: URL): Promise<boolean> {
  if (isBlockedHostnameLiteral(url.hostname)) {
    return false;
  }

  const hostname = url.hostname.trim();
  if (!hostname) {
    return false;
  }

  try {
    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (!addresses || addresses.length === 0) {
      return false;
    }

    for (const entry of addresses.slice(0, MAX_DNS_LOOKUPS)) {
      if (entry.family === 4 && isPrivateIpv4(entry.address)) {
        return false;
      }
      if (entry.family === 6 && isPrivateIpv6(entry.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIpv4(raw: string): boolean {
  const parts = raw.split(".").map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  if (a >= 224) {
    return true;
  }

  return false;
}

function isPrivateIpv6(raw: string): boolean {
  const lowered = raw.toLowerCase().split("%")[0] ?? "";
  if (!lowered) {
    return true;
  }

  if (lowered === "::" || lowered === "::1") {
    return true;
  }

  if (lowered.startsWith("fc") || lowered.startsWith("fd")) {
    return true;
  }

  if (
    lowered.startsWith("fe8")
    || lowered.startsWith("fe9")
    || lowered.startsWith("fea")
    || lowered.startsWith("feb")
  ) {
    return true;
  }

  if (lowered.startsWith("ff")) {
    return true;
  }

  if (lowered.startsWith("::ffff:")) {
    const mapped = lowered.slice("::ffff:".length);
    const ipv4Candidate = mapped.includes(".") ? mapped : "";
    if (ipv4Candidate && isPrivateIpv4(ipv4Candidate)) {
      return true;
    }
  }

  return false;
}
