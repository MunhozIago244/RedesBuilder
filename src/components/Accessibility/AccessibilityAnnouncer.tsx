// ─── Accessibility Announcer ────────────────────────────────────────────────
// Componente e hook para anúncios acessíveis via aria-live.
// Todos os eventos da simulação geram strings descritivas para screen readers.

import React, { useState, useEffect, useCallback } from "react";
import { simEventBus } from "@/engine/core/eventBus";

interface Announcement {
  id: number;
  message: string;
  priority: "polite" | "assertive";
  timestamp: number;
}

let announcementId = 0;

/**
 * Hook para gerenciar anúncios de acessibilidade.
 */
export function useAccessibilityAnnouncer() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const unsub = simEventBus.on("announce", ({ message, priority }) => {
      const announcement: Announcement = {
        id: ++announcementId,
        message,
        priority,
        timestamp: Date.now(),
      };

      setAnnouncements((prev) => [...prev.slice(-10), announcement]);

      // Auto-limpar após 5 segundos
      setTimeout(() => {
        setAnnouncements((prev) =>
          prev.filter((a) => a.id !== announcement.id),
        );
      }, 5000);
    });

    return unsub;
  }, []);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      simEventBus.emit("announce", { message, priority });
    },
    [],
  );

  return { announcements, announce };
}

/**
 * AccessibilityAnnouncer — Região aria-live para screen readers.
 *
 * Deve ser montado uma vez no topo da aplicação.
 * Invisível visualmente, mas lido por screen readers.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <AccessibilityAnnouncer />
 *       <MainContent />
 *     </>
 *   );
 * }
 * ```
 */
export const AccessibilityAnnouncer: React.FC = () => {
  const { announcements } = useAccessibilityAnnouncer();

  // Separar por prioridade
  const polite = announcements.filter((a) => a.priority === "polite");
  const assertive = announcements.filter((a) => a.priority === "assertive");

  return (
    <>
      {/* Região polite — anúncios de rotina (movimentos de pacotes, aprendizado ARP) */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        className="sr-only"
        aria-label="Log de eventos da simulação de rede"
      >
        {polite.map((a) => (
          <p key={a.id}>{a.message}</p>
        ))}
      </div>

      {/* Região assertive — anúncios críticos (erros, conclusão) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        aria-label="Alertas críticos da simulação"
      >
        {assertive.length > 0 && (
          <p>{assertive[assertive.length - 1].message}</p>
        )}
      </div>
    </>
  );
};

export default AccessibilityAnnouncer;
