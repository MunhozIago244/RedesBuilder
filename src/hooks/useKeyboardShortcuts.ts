// ─── Keyboard Shortcuts Hook ────────────────────────────────────────────────
// Atalhos de acessibilidade para o canvas.

import { useEffect } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";

export function useKeyboardShortcuts() {
  const removeNode = useNetworkStore((s) => s.removeNode);
  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId);
  const selectNode = useNetworkStore((s) => s.selectNode);
  const undo = useNetworkStore((s) => s.undo);
  const redo = useNetworkStore((s) => s.redo);
  const autoLayout = useNetworkStore((s) => s.autoLayout);
  const toggleSimulation = useNetworkStore((s) => s.toggleSimulation);
  const toggleDebug = useNetworkStore((s) => s.toggleDebug);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Não capturar atalhos em inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Delete / Backspace — Deletar nó selecionado
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        e.preventDefault();
        removeNode(selectedNodeId);
      }

      // Ctrl+Z — Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z ou Ctrl+Y — Redo
      if (
        (e.ctrlKey && e.shiftKey && e.key === "Z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }

      // Ctrl+L — Auto-Layout
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        autoLayout();
      }

      // Escape — Deselecionar
      if (e.key === "Escape") {
        selectNode(null);
      }

      // S — Toggle Simulação
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        toggleSimulation();
      }

      // D — Toggle Debug
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) {
        toggleDebug();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    removeNode,
    selectNode,
    undo,
    redo,
    autoLayout,
    toggleSimulation,
    toggleDebug,
  ]);
}
