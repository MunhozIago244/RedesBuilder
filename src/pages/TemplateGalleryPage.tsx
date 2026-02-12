// ─── TemplateGalleryPage.tsx ──────────────────────────────────────────────────
// Galeria de templates com preview, filtros e aplicação.

import React, { useState, useMemo } from "react";
import {
  LayoutTemplate,
  Search,
  ArrowRight,
  Network,
  Boxes,
  Tag,
  Award,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DiagramTemplate } from "@/types/platform";
import { DIAGRAM_TEMPLATES } from "@/data/templates/TemplateData";
import { useArchStore } from "@/store/useArchStore";

// ═══════════════════════════════════════════════════════════════════════════════

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-green-400 bg-green-500/10 border-green-500/20",
  intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  advanced: "text-red-400 bg-red-500/10 border-red-500/20",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

// ═══════════════════════════════════════════════════════════════════════════════

const TemplateCard: React.FC<{
  template: DiagramTemplate;
  onApply: (tpl: DiagramTemplate) => void;
}> = ({ template, onApply }) => {
  const isArch = template.category === "architecture";

  return (
    <div className="group bg-slate-900/50 border border-white/5 rounded-xl hover:border-white/10 transition-all duration-200 overflow-hidden">
      {/* Preview area */}
      <div
        className={`h-28 flex items-center justify-center relative ${
          isArch ? "bg-violet-500/5" : "bg-cyan-500/5"
        }`}
      >
        <span className="text-4xl">{template.thumbnail}</span>
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {isArch ? (
            <Boxes className="w-3 h-3 text-violet-400" />
          ) : (
            <Network className="w-3 h-3 text-cyan-400" />
          )}
          <span
            className={`text-[9px] font-medium ${isArch ? "text-violet-400" : "text-cyan-400"}`}
          >
            {isArch ? "Arquitetura" : "Rede"}
          </span>
        </div>
        <div
          className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[template.difficulty]}`}
        >
          {DIFFICULTY_LABELS[template.difficulty]}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-200 mb-1">
          {template.name}
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[9px] text-gray-600 bg-white/5 rounded px-1.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3 text-[10px] text-gray-600">
          <span>{template.components.length} componentes</span>
          <span>{template.connections.length} conexões</span>
          {template.estimatedCost && <span>{template.estimatedCost}</span>}
        </div>

        {/* Apply button */}
        <button
          onClick={() => onApply(template)}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
            isArch
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20"
              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
        >
          <Zap className="w-3 h-3" />
          Aplicar Template
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════

const TemplateGalleryPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "architecture" | "network"
  >("all");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "beginner" | "intermediate" | "advanced"
  >("all");
  const navigate = useNavigate();
  const archStore = useArchStore();

  const filtered = useMemo(() => {
    return DIAGRAM_TEMPLATES.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter)
        return false;
      if (difficultyFilter !== "all" && t.difficulty !== difficultyFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, categoryFilter, difficultyFilter]);

  const handleApply = (tpl: DiagramTemplate) => {
    if (
      archStore.nodes.length > 0 &&
      !window.confirm(
        "Aplicar este template substituirá o diagrama atual. Continuar?",
      )
    ) {
      return;
    }
    if (tpl.category === "architecture") {
      // Create React Flow nodes from template components
      const newNodes = tpl.components.map((comp) => ({
        id: comp.id,
        type: comp.type,
        position: { x: comp.x, y: comp.y },
        data: {
          label: comp.label,
          type: comp.type,
          componentType: comp.type,
          category: "compute",
          color: "#06b6d4",
          icon: "Server",
        },
      }));

      const newEdges = tpl.connections.map((conn, i) => ({
        id: `tpl-edge-${i}`,
        source: conn.sourceId,
        target: conn.targetId,
        type: "archEdge",
        data: {
          protocol: conn.protocol ?? "TCP",
          direction: "unidirectional" as const,
        },
      }));

      archStore.setNodes(newNodes as Parameters<typeof archStore.setNodes>[0]);
      archStore.setEdges(newEdges as Parameters<typeof archStore.setEdges>[0]);
      navigate("/arch");
    } else {
      // For network templates, navigate to network builder
      navigate("/redes");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LayoutTemplate className="w-5 h-5 text-pink-400" />
            <h1 className="text-lg font-bold">Template Gallery</h1>
            <span className="text-xs text-gray-600">
              ({DIAGRAM_TEMPLATES.length} templates)
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar templates..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/5 rounded-lg text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-white/10"
            />
          </div>

          {/* Category */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(["all", "architecture", "network"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-[10px] rounded transition-colors ${
                  categoryFilter === cat
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {cat === "all"
                  ? "Todos"
                  : cat === "architecture"
                    ? "Arquitetura"
                    : "Rede"}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(["all", "beginner", "intermediate", "advanced"] as const).map(
              (diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-2.5 py-1.5 text-[10px] rounded transition-colors ${
                    difficultyFilter === diff
                      ? "bg-white/10 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {diff === "all" ? "Todos" : DIFFICULTY_LABELS[diff]}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LayoutTemplate className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Nenhum template encontrado
              </p>
              <p className="text-xs text-gray-600">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {filtered.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGalleryPage;
