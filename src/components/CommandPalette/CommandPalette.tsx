// ─── CommandPalette.tsx ──────────────────────────────────────────────────────
// Modal universal de busca e ações rápidas — abre com Ctrl+K.
// Busca componentes, ações, páginas, templates com fuzzy search.

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Network,
  Boxes,
  Shield,
  DollarSign,
  LayoutTemplate,
  Code2,
  History,
  ArrowRight,
  Command,
  X,
  Zap,
  Settings,
  Download,
  FileCode2,
  Bug,
  Gauge,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════

interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  extraActions?: PaletteAction[];
}

// ═══════════════════════════════════════════════════════════════════════════════

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ═══════════════════════════════════════════════════════════════════════════════

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  extraActions = [],
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Built-in actions ──
  const builtinActions: PaletteAction[] = useMemo(
    () => [
      // Navigation
      {
        id: "go-dashboard",
        label: "Ir para Dashboard",
        icon: Zap,
        category: "Navegação",
        keywords: ["home", "inicio", "dashboard"],
        action: () => navigate("/"),
      },
      {
        id: "go-network",
        label: "Abrir Network Builder",
        icon: Network,
        category: "Navegação",
        keywords: ["rede", "network", "topologia"],
        action: () => navigate("/redes"),
      },
      {
        id: "go-arch",
        label: "Abrir Architecture Builder",
        icon: Boxes,
        category: "Navegação",
        keywords: ["arquitetura", "architecture", "diagrama"],
        action: () => navigate("/arch"),
      },
      {
        id: "go-codegen",
        label: "Abrir Code Generator",
        icon: Code2,
        category: "Navegação",
        keywords: ["codigo", "gerar", "docker", "terraform", "code"],
        action: () => navigate("/codegen"),
      },
      {
        id: "go-security",
        label: "Abrir Security Analyzer",
        icon: Shield,
        category: "Navegação",
        keywords: ["segurança", "security", "vulnerabilidade"],
        action: () => navigate("/security"),
      },
      {
        id: "go-cost",
        label: "Abrir Cost Estimator",
        icon: DollarSign,
        category: "Navegação",
        keywords: ["custo", "preço", "cost", "cloud"],
        action: () => navigate("/cost"),
      },
      {
        id: "go-templates",
        label: "Abrir Template Gallery",
        icon: LayoutTemplate,
        category: "Navegação",
        keywords: ["template", "modelo", "galeria"],
        action: () => navigate("/templates"),
      },
      {
        id: "go-versions",
        label: "Abrir Histórico",
        icon: History,
        category: "Navegação",
        keywords: ["versão", "historico", "version", "history"],
        action: () => navigate("/versions"),
      },

      // Quick Actions
      {
        id: "export-png",
        label: "Exportar como PNG",
        icon: Download,
        category: "Ações",
        keywords: ["export", "png", "imagem", "download"],
        action: () => {
          /* TODO: integrate export */
        },
      },
      {
        id: "export-svg",
        label: "Exportar como SVG",
        icon: FileCode2,
        category: "Ações",
        keywords: ["export", "svg", "vetor"],
        action: () => {
          /* TODO */
        },
      },
      {
        id: "run-security",
        label: "Executar Scan de Segurança",
        icon: Bug,
        category: "Ações",
        keywords: ["scan", "security", "vulnerabilidade", "analise"],
        action: () => navigate("/security"),
      },
      {
        id: "estimate-cost",
        label: "Estimar Custos Cloud",
        icon: Gauge,
        category: "Ações",
        keywords: ["custo", "estimativa", "cloud", "aws", "azure"],
        action: () => navigate("/cost"),
      },
    ],
    [navigate],
  );

  const allActions = useMemo(
    () => [...builtinActions, ...extraActions],
    [builtinActions, extraActions],
  );

  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    return allActions.filter(
      (a) =>
        fuzzyMatch(query, a.label) ||
        a.keywords.some((k) => fuzzyMatch(query, k)) ||
        (a.description && fuzzyMatch(query, a.description)),
    );
  }, [query, allActions]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteAction[]>();
    for (const a of filteredActions) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [filteredActions]);

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Focus trap ──
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  // ── Keyboard nav ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
        e.preventDefault();
        filteredActions[selectedIndex].action();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filteredActions, selectedIndex, onClose],
  );

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="relative w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar ação, página, componente..."
            aria-label="Buscar ação, página ou componente"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
          />
          <kbd className="hidden sm:inline text-[9px] text-gray-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Resultados"
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {filteredActions.length === 0 ? (
            <p className="text-center text-xs text-gray-600 py-8">
              Nenhum resultado para "{query}"
            </p>
          ) : (
            Array.from(grouped.entries()).map(([category, actions]) => (
              <div key={category}>
                <p className="px-4 pt-2 pb-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                  {category}
                </p>
                {actions.map((action) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        action.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-cyan-500/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      <action.icon
                        className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-cyan-400" : "text-gray-600"}`}
                      />
                      <span className="flex-1 text-xs font-medium">
                        {action.label}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-3 h-3 text-cyan-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-[9px] text-gray-600">
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">
              ↑↓
            </kbd>{" "}
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">
              ↵
            </kbd>{" "}
            selecionar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">
              esc
            </kbd>{" "}
            fechar
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

// ── Hook para abrir/fechar com Ctrl+K ──
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
