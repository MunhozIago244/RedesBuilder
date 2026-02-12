// ─── ArchToolbar.tsx ─────────────────────────────────────────────────────────
// Toolbar superior do Architecture Builder — undo, redo, zoom, etc.

import React from "react";
import { useReactFlow } from "reactflow";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Trash2 } from "lucide-react";
import { useArchStore } from "@/store/useArchStore";

const ArchToolbar: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useArchStore((s) => s.undo);
  const redo = useArchStore((s) => s.redo);
  const nodes = useArchStore((s) => s.nodes);
  const edges = useArchStore((s) => s.edges);
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);
  const removeNode = useArchStore((s) => s.removeNode);

  const handleDelete = () => {
    if (selectedNodeId) removeNode(selectedNodeId);
  };

  return (
    <div className="h-10 flex-shrink-0 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center px-3 gap-1">
      {/* Undo / Redo */}
      <ToolBtn icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={undo} />
      <ToolBtn icon={Redo2} label="Refazer (Ctrl+Y)" onClick={redo} />

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Zoom */}
      <ToolBtn icon={ZoomIn} label="Zoom In" onClick={() => zoomIn()} />
      <ToolBtn icon={ZoomOut} label="Zoom Out" onClick={() => zoomOut()} />
      <ToolBtn
        icon={Maximize2}
        label="Fit View"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
      />

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Delete */}
      <ToolBtn
        icon={Trash2}
        label="Remover selecionado"
        onClick={handleDelete}
        disabled={!selectedNodeId}
        danger
      />

      {/* Stats */}
      <div className="flex-1" />
      <span className="text-[9px] text-gray-600 font-mono">
        {nodes.length} componentes · {edges.length} conexões
      </span>
    </div>
  );
};

// ── Botão reutilizável ──
const ToolBtn: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, disabled, danger }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`p-1.5 rounded-md transition-all ${
      disabled
        ? "text-gray-700 cursor-not-allowed"
        : danger
          ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

export default ArchToolbar;
