// ─── ArchComponentLibrary.tsx ────────────────────────────────────────────────
// Sidebar do Architecture Builder — catálogo de componentes arrastáveis.

import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search } from "lucide-react";
import {
  ARCH_COMPONENT_TEMPLATES,
  ARCH_CATEGORY_LABELS,
  ARCH_CATEGORY_ORDER,
  type ArchComponentTemplate,
} from "@/types/arch";

function resolveIcon(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? LucideIcons.Box;
}

/** Item arrastável de componente */
const ComponentItem: React.FC<{ template: ArchComponentTemplate }> = ({
  template,
}) => {
  const Icon = useMemo(() => resolveIcon(template.icon), [template.icon]);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/archbuilder-type", template.type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all group"
      title={`Arraste para adicionar: ${template.label}`}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${template.color}15`,
          border: `1px solid ${template.color}25`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: template.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-gray-300 truncate group-hover:text-white transition-colors">
          {template.label}
        </p>
        <p className="text-[8px] text-gray-600 truncate">
          {template.defaultTech}
        </p>
      </div>
    </div>
  );
};

const ArchComponentLibrary: React.FC = () => {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return ARCH_COMPONENT_TEMPLATES;
    const q = search.toLowerCase();
    return ARCH_COMPONENT_TEMPLATES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.defaultTech.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ArchComponentTemplate[]>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [filtered]);

  const toggleCategory = (cat: string) =>
    setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/5">
        <h2 className="text-xs font-bold text-gray-300 tracking-wide mb-2">
          📦 Componentes
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar componente..."
            className="w-full bg-white/5 border border-white/5 rounded-md py-1.5 pl-7 pr-2 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 scrollbar-thin">
        {ARCH_CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;
          const isCollapsed = collapsed[cat];
          const label = ARCH_CATEGORY_LABELS[cat] ?? cat;

          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-[10px] font-semibold text-gray-400 hover:text-gray-200 transition-colors"
              >
                <span>{label}</span>
                <span className="text-[9px] text-gray-600">
                  {isCollapsed ? "▸" : "▾"} {items.length}
                </span>
              </button>
              {!isCollapsed && (
                <div className="flex flex-col gap-1 mt-0.5 pl-0.5">
                  {items.map((t) => (
                    <ComponentItem key={t.type} template={t} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-[10px] text-gray-600 py-6">
            Nenhum componente encontrado
          </p>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-white/5">
        <p className="text-[8px] text-gray-600 leading-relaxed text-center">
          Arraste componentes para o canvas. Conecte arrastando dos pontos ● de
          cada nó.
        </p>
      </div>
    </div>
  );
};

export default ArchComponentLibrary;
