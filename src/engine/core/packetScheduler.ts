// ─── Packet Scheduler ───────────────────────────────────────────────────────
// Fila de eventos temporizada — pacotes NÃO se teletransportam.
// Usa priority queue baseada em tick para ordenar a execução de eventos.

import type {
  ScheduledEvent,
  SchedulerConfig,
  SimulationSpeed,
  SimPacket,
  SPEED_MULTIPLIERS,
} from "@/types/simulation";
import { DEFAULT_SCHEDULER_CONFIG } from "@/types/simulation";
import { SimEventBus } from "./eventBus";

/**
 * PacketScheduler — gerencia o "heartbeat" da simulação.
 *
 * Cada tick representa uma unidade de tempo simulado.
 * Pacotes são agendados com delay (ticks) baseado na latência configurada.
 * O scheduler processa todos os eventos do tick atual a cada chamada de `tick()`.
 */
export class PacketScheduler {
  private queue: ScheduledEvent[] = [];
  private currentTick = 0;
  private config: SchedulerConfig;
  private eventBus: SimEventBus;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private nextEventId = 0;

  constructor(eventBus: SimEventBus, config?: Partial<SchedulerConfig>) {
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  // ─── Scheduling ─────────────────────────────────────────────────────

  /**
   * Agenda um evento para ser processado após `delayTicks` ticks.
   * Retorna o ID do evento agendado.
   */
  schedule(
    type: ScheduledEvent["type"],
    delayTicks: number,
    packet?: SimPacket,
    data?: Record<string, unknown>,
  ): string {
    const id = `evt-${++this.nextEventId}`;
    const event: ScheduledEvent = {
      id,
      scheduledTick: this.currentTick + Math.max(1, delayTicks),
      type,
      packet,
      data,
    };

    // Inserir mantendo ordem por tick (priority queue simples)
    this.insertSorted(event);
    return id;
  }

  /**
   * Agenda o forwarding de um pacote com latência baseada na configuração.
   */
  schedulePacketForward(packet: SimPacket, latencyMultiplier = 1): string {
    const baseTicks = Math.max(
      1,
      Math.ceil(
        (this.config.baseLatencyMs / this.config.tickIntervalMs) *
          latencyMultiplier,
      ),
    );
    return this.schedule("packet-forward", baseTicks, packet);
  }

  /** Cancelar um evento agendado */
  cancel(eventId: string): boolean {
    const idx = this.queue.findIndex((e) => e.id === eventId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ─── Tick Processing ────────────────────────────────────────────────

  /**
   * Processa um tick da simulação.
   * Retorna todos os eventos que estavam agendados para o tick atual.
   */
  tick(): ScheduledEvent[] {
    this.currentTick++;
    this.eventBus.emit("sim:tick", { tick: this.currentTick });

    const readyEvents: ScheduledEvent[] = [];

    // Extrair todos os eventos que devem executar neste tick
    while (
      this.queue.length > 0 &&
      this.queue[0].scheduledTick <= this.currentTick
    ) {
      readyEvents.push(this.queue.shift()!);
    }

    return readyEvents;
  }

  // ─── Auto-run (Timer) ──────────────────────────────────────────────

  /** Iniciar simulação automática com intervalo baseado na velocidade */
  start(onTick: (events: ScheduledEvent[]) => void): void {
    if (this.running) return;
    this.running = true;

    const intervalMs = this.getTickInterval();
    this.eventBus.emit("sim:start", { mode: "auto" });

    this.timerId = setInterval(() => {
      const events = this.tick();
      onTick(events);

      // Se não há mais eventos na fila e nada está agendado, parar
      if (this.queue.length === 0 && events.length === 0) {
        // Dar um grace period de alguns ticks antes de encerrar
        // para permitir que novos eventos sejam criados em resposta
      }
    }, intervalMs);
  }

  /** Pausar simulação */
  pause(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.running = false;
    this.eventBus.emit("sim:pause", {});
  }

  /** Parar e resetar */
  reset(): void {
    this.pause();
    this.queue = [];
    this.currentTick = 0;
    this.nextEventId = 0;
    this.eventBus.emit("sim:reset", {});
  }

  // ─── Speed Control ─────────────────────────────────────────────────

  /** Alterar velocidade da simulação */
  setSpeed(speed: SimulationSpeed): void {
    this.config.speed = speed;
    this.eventBus.emit("sim:speed-change", { speed });

    // Se está rodando, reiniciar com novo intervalo
    if (this.running && this.timerId) {
      const onTick = this._lastOnTick;
      this.pause();
      if (onTick) this.start(onTick);
    }
  }

  private _lastOnTick: ((events: ScheduledEvent[]) => void) | null = null;

  // Override start to save callback
  startWithCallback(onTick: (events: ScheduledEvent[]) => void): void {
    this._lastOnTick = onTick;
    this.start(onTick);
  }

  // ─── Getters ────────────────────────────────────────────────────────

  getCurrentTick(): number {
    return this.currentTick;
  }

  getConfig(): Readonly<SchedulerConfig> {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.running;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  /** Obter a duração de animação em ms para a velocidade atual */
  getAnimationDurationMs(): number {
    const speedMultipliers: Record<SimulationSpeed, number> = {
      slow: 3.0,
      normal: 1.0,
      fast: 0.3,
      instant: 0.01,
    };
    return (
      this.config.baseLatencyMs * (speedMultipliers[this.config.speed] ?? 1)
    );
  }

  /** Verificar se a fila está vazia */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private insertSorted(event: ScheduledEvent): void {
    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.queue[mid].scheduledTick <= event.scheduledTick) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.queue.splice(low, 0, event);
  }

  private getTickInterval(): number {
    const speedMultipliers: Record<SimulationSpeed, number> = {
      slow: 3.0,
      normal: 1.0,
      fast: 0.3,
      instant: 0.01,
    };
    return Math.max(
      10,
      this.config.tickIntervalMs * (speedMultipliers[this.config.speed] ?? 1),
    );
  }
}
