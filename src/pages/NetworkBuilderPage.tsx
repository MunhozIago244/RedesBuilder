// ─── NetworkBuilderPage.tsx ──────────────────────────────────────────────────
// Wrapper de rota para o RedesBuilder (ferramenta de topologia de rede).
// Toda a lógica original de App.tsx agora vive aqui.

import React, { useState } from "react";
import { ReactFlowProvider } from "reactflow";
import NetworkCanvas from "@/components/Canvas/NetworkCanvas";
import DeviceLibrary from "@/components/Sidebar/DeviceLibrary";
import InspectorPanel from "@/components/Inspector/InspectorPanel";
import TopToolbar from "@/components/Toolbar/TopToolbar";
import DebugPanel from "@/components/DebugPanel/DebugPanel";
import ConnectionManagerModal from "@/components/ConnectionManager/ConnectionManagerModal";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNetworkStore } from "@/store/useNetworkStore";
import { SimConsole } from "@/components/Simulation/SimConsole";
import { PacketInspector } from "@/components/Simulation/PacketInspector";
import { AccessibilityAnnouncer } from "@/components/Accessibility/AccessibilityAnnouncer";
import { usePacketAnimation } from "@/hooks/usePacketAnimation";

const NetworkBuilderContent: React.FC = () => {
  useKeyboardShortcuts();

  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId);
  const showPortModal = useNetworkStore((s) => s.showPortModal);
  const simulationMode = useNetworkStore((s) => s.simulationMode);

  const [showConsole, setShowConsole] = useState(false);
  const { inspectedPacket, inspectPacket } = usePacketAnimation();

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top Toolbar */}
      <ErrorBoundary section="Toolbar">
        <TopToolbar />
      </ErrorBoundary>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Device Library */}
        <aside className="w-64 flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 overflow-hidden flex flex-col">
          <ErrorBoundary section="Biblioteca de Dispositivos">
            <DeviceLibrary />
          </ErrorBoundary>
        </aside>

        {/* Center — Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <ErrorBoundary section="Canvas">
            <NetworkCanvas />
            <DebugPanel />
          </ErrorBoundary>

          {simulationMode && !showConsole && (
            <button
              onClick={() => setShowConsole(true)}
              className="fixed bottom-4 left-72 z-30 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-[10px] text-gray-400 hover:text-white hover:bg-slate-700/80 transition-all backdrop-blur-sm"
              aria-label="Abrir console de simulação"
            >
              ▲ Console
            </button>
          )}
        </main>

        {/* Right Sidebar — Inspector Panel */}
        {selectedNodeId && (
          <aside className="w-80 flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-l border-white/5 overflow-hidden flex flex-col">
            <ErrorBoundary section="Inspector">
              <InspectorPanel />
            </ErrorBoundary>
          </aside>
        )}
      </div>

      {/* Connection Manager Modal */}
      {showPortModal && <ConnectionManagerModal />}

      {/* Simulation Console */}
      <SimConsole isOpen={showConsole} onClose={() => setShowConsole(false)} />

      {/* Packet Inspector */}
      {inspectedPacket && (
        <PacketInspector
          packet={inspectedPacket}
          onClose={() => inspectPacket(null)}
        />
      )}

      {/* Accessibility */}
      <AccessibilityAnnouncer />
    </div>
  );
};

const NetworkBuilderPage: React.FC = () => (
  <ReactFlowProvider>
    <NetworkBuilderContent />
  </ReactFlowProvider>
);

export default NetworkBuilderPage;
