// ─── ArchBuilderPage.tsx ─────────────────────────────────────────────────────
// Página principal do Architecture Builder — diagrama de frontend / backend.

import React from "react";
import { ReactFlowProvider } from "reactflow";
import ArchCanvas from "@/components/ArchBuilder/Canvas/ArchCanvas";
import ArchComponentLibrary from "@/components/ArchBuilder/Sidebar/ArchComponentLibrary";
import ArchToolbar from "@/components/ArchBuilder/Toolbar/ArchToolbar";
import ArchInspector from "@/components/ArchBuilder/Inspector/ArchInspector";
import { useArchStore } from "@/store/useArchStore";

const ArchBuilderContent: React.FC = () => {
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar */}
      <ArchToolbar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Component Library */}
        <aside className="w-64 flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 overflow-hidden flex flex-col">
          <ArchComponentLibrary />
        </aside>

        {/* Center — Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <ArchCanvas />
        </main>

        {/* Right Sidebar — Inspector */}
        {selectedNodeId && (
          <aside className="w-80 flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-l border-white/5 overflow-hidden flex flex-col">
            <ArchInspector />
          </aside>
        )}
      </div>
    </div>
  );
};

const ArchBuilderPage: React.FC = () => (
  <ReactFlowProvider>
    <ArchBuilderContent />
  </ReactFlowProvider>
);

export default ArchBuilderPage;
