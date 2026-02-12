// ─── Event Bus ──────────────────────────────────────────────────────────────
// Sistema de eventos central da engine de simulação.
// Typed event emitter com suporte a wildcard listeners para debugging.

import type { SimEventType, SimEventMap } from "@/types/simulation";

type EventCallback<T = unknown> = (payload: T) => void;

/**
 * EventBus tipado — coluna vertebral da comunicação entre engine e UI.
 *
 * A UI (React hooks) assina eventos como `packet:move` e `packet:drop`
 * para renderizar animações. A engine emite eventos conforme processa pacotes.
 *
 * @example
 * ```ts
 * const bus = new SimEventBus();
 * bus.on("packet:move", (event) => { animatePacket(event); });
 * bus.emit("packet:move", { packet, fromNodeId, toNodeId, edgeId, animationDurationMs: 800 });
 * ```
 */
export class SimEventBus {
  private listeners = new Map<string, Set<EventCallback>>();
  private wildcardListeners = new Set<
    EventCallback<{ type: string; payload: unknown }>
  >();
  private _eventLog: Array<{
    type: string;
    payload: unknown;
    timestamp: number;
  }> = [];
  private _maxLogSize = 500;

  /** Assinar um tipo de evento específico */
  on<K extends SimEventType>(
    event: K,
    callback: EventCallback<SimEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    // Retorna função de unsubscribe para facilitar cleanup em useEffect
    return () => this.off(event, callback);
  }

  /** Remover listener */
  off<K extends SimEventType>(
    event: K,
    callback: EventCallback<SimEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
  }

  /** Emitir evento tipado */
  emit<K extends SimEventType>(event: K, payload: SimEventMap[K]): void {
    // Log para debugging
    this._eventLog.push({ type: event, payload, timestamp: Date.now() });
    if (this._eventLog.length > this._maxLogSize) {
      this._eventLog.shift();
    }

    // Notificar listeners específicos
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[SimEventBus] Error in listener for '${event}':`, err);
        }
      }
    }

    // Notificar wildcard listeners (útil para DebugPanel)
    for (const cb of this.wildcardListeners) {
      try {
        cb({ type: event, payload });
      } catch (err) {
        console.error(`[SimEventBus] Error in wildcard listener:`, err);
      }
    }
  }

  /** Assinar TODOS os eventos (para debug/logging) */
  onAny(
    callback: EventCallback<{ type: string; payload: unknown }>,
  ): () => void {
    this.wildcardListeners.add(callback);
    return () => this.wildcardListeners.delete(callback);
  }

  /** Esperar por um evento específico (Promise-based, com timeout) */
  waitFor<K extends SimEventType>(
    event: K,
    timeoutMs = 10000,
  ): Promise<SimEventMap[K]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`Timeout waiting for event '${event}'`));
      }, timeoutMs);

      const unsub = this.on(event, (payload) => {
        clearTimeout(timer);
        unsub();
        resolve(payload);
      });
    });
  }

  /** Limpar todos os listeners */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this._eventLog = [];
  }

  /** Obter log de eventos para debugging */
  getEventLog() {
    return [...this._eventLog];
  }

  /** Verificar se existe listener para um evento */
  hasListeners(event: SimEventType): boolean {
    return (
      (this.listeners.get(event)?.size ?? 0) > 0 ||
      this.wildcardListeners.size > 0
    );
  }
}

/** Instância singleton do Event Bus — compartilhada entre engine e UI */
export const simEventBus = new SimEventBus();
