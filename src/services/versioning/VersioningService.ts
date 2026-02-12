// ─── VersioningService.ts ────────────────────────────────────────────────────
// Serviço de versionamento com auto-save no localStorage.
// Mantém histórico de versões dos diagramas com diff e restore.

import type { DiagramVersion, DiagramDiff } from "@/types/platform";

// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "netbuilder_versions";
const MAX_VERSIONS = 50;
const AUTO_SAVE_INTERVAL = 30_000; // 30s

// ═══════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Storage ──

function hasLocalStorage(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  } catch {
    return false;
  }
}

function loadVersions(): DiagramVersion[] {
  if (!hasLocalStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: DiagramVersion[]): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(versions.slice(-MAX_VERSIONS)),
    );
  } catch {
    // Storage full — trim older entries
    try {
      const trimmed = versions.slice(-Math.floor(MAX_VERSIONS / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Storage completely full — can't do anything
    }
  }
}

// ── Public API ──

export function saveVersion(
  diagramId: string,
  diagramType: "network" | "architecture",
  snapshot: string,
  label?: string,
  isAutoSave = false,
): DiagramVersion {
  const versions = loadVersions();
  const prev = versions.filter((v) => v.diagramId === diagramId);

  const version: DiagramVersion = {
    id: generateId(),
    diagramId,
    diagramType,
    snapshot,
    label:
      label ?? (isAutoSave ? "Auto-save" : `Manual save #${prev.length + 1}`),
    createdAt: new Date().toISOString(),
    isAutoSave,
    componentCount: 0,
    connectionCount: 0,
  };

  // Extract counts from snapshot
  try {
    const parsed = JSON.parse(snapshot);
    version.componentCount =
      parsed.nodes?.length ?? parsed.components?.length ?? 0;
    version.connectionCount =
      parsed.edges?.length ?? parsed.connections?.length ?? 0;
  } catch {
    // Ignore
  }

  versions.push(version);
  saveVersions(versions);
  return version;
}

export function getVersions(diagramId?: string): DiagramVersion[] {
  const all = loadVersions();
  if (!diagramId) return all;
  return all.filter((v) => v.diagramId === diagramId);
}

export function getVersion(versionId: string): DiagramVersion | undefined {
  return loadVersions().find((v) => v.id === versionId);
}

export function deleteVersion(versionId: string): void {
  const versions = loadVersions().filter((v) => v.id !== versionId);
  saveVersions(versions);
}

export function clearVersions(diagramId?: string): void {
  if (!hasLocalStorage()) return;
  if (!diagramId) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const versions = loadVersions().filter((v) => v.diagramId !== diagramId);
  saveVersions(versions);
}

export function computeDiff(
  versionA: DiagramVersion,
  versionB: DiagramVersion,
): DiagramDiff {
  try {
    const a = JSON.parse(versionA.snapshot);
    const b = JSON.parse(versionB.snapshot);

    const aNodeIds = new Set(
      (a.nodes ?? a.components ?? []).map((n: { id: string }) => n.id),
    );
    const bNodeIds = new Set(
      (b.nodes ?? b.components ?? []).map((n: { id: string }) => n.id),
    );

    const added = [...bNodeIds].filter((id) => !aNodeIds.has(id));
    const removed = [...aNodeIds].filter((id) => !bNodeIds.has(id));

    return {
      fromVersion: versionA.id,
      toVersion: versionB.id,
      addedComponents: added.length,
      removedComponents: removed.length,
      modifiedComponents: 0, // Simplified — full diff would compare props
      addedConnections: 0,
      removedConnections: 0,
      summary: `+${added.length} componentes, -${removed.length} componentes`,
    };
  } catch {
    return {
      fromVersion: versionA.id,
      toVersion: versionB.id,
      addedComponents: 0,
      removedComponents: 0,
      modifiedComponents: 0,
      addedConnections: 0,
      removedConnections: 0,
      summary: "Não foi possível calcular diff",
    };
  }
}

// ── Auto-Save Hook ──

export function createAutoSaver(
  diagramId: string,
  diagramType: "network" | "architecture",
  getSnapshot: () => string,
): { start: () => void; stop: () => void } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastSnapshot = "";

  return {
    start() {
      intervalId = setInterval(() => {
        const current = getSnapshot();
        if (current !== lastSnapshot && current.length > 10) {
          lastSnapshot = current;
          saveVersion(diagramId, diagramType, current, undefined, true);
        }
      }, AUTO_SAVE_INTERVAL);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
