// ─── Device Library Sidebar ─────────────────────────────────────────────────
// Painel lateral com drag-and-drop de equipamentos para o canvas.

import React, { useState, memo } from "react";
import {
  Router,
  Network,
  Wifi,
  Monitor,
  Laptop,
  Phone,
  Server,
  Printer,
  Globe,
  Cloud,
  Shield,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Search,
  Tv,
  Speaker,
  Lightbulb,
  Camera,
  Bot,
  Thermometer,
  Gamepad2,
  Cast,
} from "lucide-react";
import type {
  DeviceType,
  DeviceCategory,
  DeviceTemplate,
} from "@/types/network";
import { DEVICE_TEMPLATES } from "@/types/network";

// ─── Icon Mapping ───────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  router: <Router size={18} />,
  "switch-l2": <Network size={18} />,
  "switch-l3": <Network size={18} />,
  "access-point": <Wifi size={18} />,
  pc: <Monitor size={18} />,
  laptop: <Laptop size={18} />,
  "ip-phone": <Phone size={18} />,
  server: <Server size={18} />,
  printer: <Printer size={18} />,
  isp: <Globe size={18} />,
  cloud: <Cloud size={18} />,
  firewall: <Shield size={18} />,
  "smart-tv": <Tv size={18} />,
  "smart-speaker": <Speaker size={18} />,
  "smart-light": <Lightbulb size={18} />,
  "security-camera": <Camera size={18} />,
  "robot-vacuum": <Bot size={18} />,
  "smart-thermostat": <Thermometer size={18} />,
  "game-console": <Gamepad2 size={18} />,
  "streaming-box": <Cast size={18} />,
};

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  networking: "🔌 Networking",
  "end-devices": "🖥️ End Devices",
  "iot-smart-home": "🏠 IoT / Smart Home",
  "cloud-wan": "☁️ Cloud / WAN",
};

const CATEGORY_ORDER: DeviceCategory[] = [
  "networking",
  "end-devices",
  "iot-smart-home",
  "cloud-wan",
];

// ─── Device Item ────────────────────────────────────────────────────────────

interface DeviceItemProps {
  template: DeviceTemplate;
}

const DeviceItem: React.FC<DeviceItemProps> = memo(({ template }) => {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow-type", template.type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
        bg-slate-800/50 hover:bg-slate-700/60
        border border-transparent hover:border-white/10
        transition-all duration-150 group
      "
      title={template.description}
      role="listitem"
      aria-label={`Arrastar ${template.label}: ${template.description}`}
    >
      <GripVertical
        size={14}
        className="text-gray-600 group-hover:text-gray-400 flex-shrink-0"
      />
      <div className="text-cyan-400 flex-shrink-0">
        {DEVICE_ICONS[template.type]}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-gray-200 truncate">
          {template.label}
        </span>
        <span className="text-[10px] text-gray-500 truncate">
          {template.description}
        </span>
      </div>
    </div>
  );
});

DeviceItem.displayName = "DeviceItem";

// ─── Category Group ─────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category: DeviceCategory;
  templates: DeviceTemplate[];
  defaultOpen?: boolean;
}

const CategoryGroup: React.FC<CategoryGroupProps> = memo(
  ({ category, templates, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
          flex items-center gap-2 w-full px-3 py-2 rounded-lg
          text-sm font-semibold text-gray-300
          hover:bg-slate-800/50 transition-colors
        "
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {CATEGORY_LABELS[category]}
          <span className="text-[10px] text-gray-600 ml-auto">
            {templates.length}
          </span>
        </button>
        {isOpen && (
          <div className="flex flex-col gap-1 mt-1 pl-1" role="list">
            {templates.map((t) => (
              <DeviceItem key={t.type} template={t} />
            ))}
          </div>
        )}
      </div>
    );
  },
);

CategoryGroup.displayName = "CategoryGroup";

// ─── Main Component ─────────────────────────────────────────────────────────

const DeviceLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = searchQuery
    ? DEVICE_TEMPLATES.filter(
        (t) =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : DEVICE_TEMPLATES;

  const groupedByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    templates: filteredTemplates.filter((t) => t.category === cat),
  })).filter((g) => g.templates.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-bold text-gray-100 tracking-wide">
          📦 Componentes
        </h2>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Arraste para o canvas
        </p>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dispositivo..."
            aria-label="Buscar dispositivo na biblioteca"
            className="
              w-full pl-9 pr-3 py-2 rounded-lg text-xs
              bg-slate-800/60 border border-white/5
              text-gray-300 placeholder-gray-600
              focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
              transition-all
            "
          />
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
        {groupedByCategory.map((group) => (
          <CategoryGroup
            key={group.category}
            category={group.category}
            templates={group.templates}
          />
        ))}
        {groupedByCategory.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">
            Nenhum dispositivo encontrado
          </div>
        )}
      </div>

      {/* Footer — Shortcuts */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="text-[9px] text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Deletar nó</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              Del
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Desfazer</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              Ctrl+Z
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Auto-Layout</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              Ctrl+L
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Simulação</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              S
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Debug</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              D
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceLibrary;
