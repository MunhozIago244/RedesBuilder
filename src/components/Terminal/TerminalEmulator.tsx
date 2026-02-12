// ─── Terminal Emulator Component ────────────────────────────────────────────
// Terminal CLI estilo IOS integrado ao InspectorPanel como aba "Console".
// Lazy-loaded via React.lazy() para não impactar bundle inicial.
// Integra com cliEngine puro via callbacks.

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Terminal, ChevronRight } from "lucide-react";
import { useNetworkStore } from "@/store/useNetworkStore";
import type { CliState, NetworkInterface } from "@/types/network";
import {
  processCommand,
  buildPrompt,
  createInitialCliState,
  getCompletions,
  type CliContext,
} from "@/engine/cliEngine";
import { getHardwareModel } from "@/data/deviceLibrary";

// ─── Props ──────────────────────────────────────────────────────────────────

interface TerminalEmulatorProps {
  nodeId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const TerminalEmulator: React.FC<TerminalEmulatorProps> = memo(({ nodeId }) => {
  const node = useNetworkStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useNetworkStore((s) => s.updateNodeData);

  const [cliState, setCliState] = useState<CliState>(() => {
    const model = node?.data.hardwareModel
      ? getHardwareModel(node.data.hardwareModel)
      : undefined;
    const hostname = node?.data.label.replace(/\s+\d+$/, "") ?? "Device";
    return createInitialCliState(hostname);
  });

  const [inputValue, setInputValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll no output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [cliState.output]);

  // Focus no input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Callback para atualizar interface no store
  const onUpdateInterface = useCallback(
    (interfaceId: string, data: Partial<NetworkInterface>) => {
      if (!node) return;
      const updatedInterfaces = node.data.interfaces.map((iface) =>
        iface.id === interfaceId ? { ...iface, ...data } : iface,
      );
      updateNodeData(nodeId, { interfaces: updatedInterfaces });
    },
    [node, nodeId, updateNodeData],
  );

  // Callback para atualizar dados do nó
  const onUpdateData = useCallback(
    (data: Parameters<typeof updateNodeData>[1]) => {
      updateNodeData(nodeId, data);
    },
    [nodeId, updateNodeData],
  );

  // Processar comando
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!node) return;

      const context: CliContext = {
        deviceData: node.data,
        onUpdateData,
        onUpdateInterface,
      };

      const result = processCommand(inputValue, cliState, context);
      setCliState(result.newState);
      setInputValue("");
      setHistoryIndex(-1);
    },
    [inputValue, cliState, node, onUpdateData, onUpdateInterface],
  );

  // Keyboard navigation (history, tab-complete)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const cmds = cliState.history;
        if (cmds.length === 0) return;
        const newIndex =
          historyIndex === -1 ? cmds.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(cmds[newIndex]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const cmds = cliState.history;
        if (historyIndex === -1) return;
        const newIndex = historyIndex + 1;
        if (newIndex >= cmds.length) {
          setHistoryIndex(-1);
          setInputValue("");
        } else {
          setHistoryIndex(newIndex);
          setInputValue(cmds[newIndex]);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const completions = getCompletions(inputValue, cliState.mode);
        if (completions.length === 1) {
          setInputValue(completions[0] + " ");
        } else if (completions.length > 1) {
          // Mostrar opções
          setCliState((prev) => ({
            ...prev,
            output: [
              ...prev.output,
              `${buildPrompt(prev)} ${inputValue}`,
              completions.map((c) => `  ${c}`).join("\n"),
            ],
          }));
        }
      }
    },
    [cliState, historyIndex, inputValue],
  );

  if (!node) return null;

  // Verificar se o dispositivo suporta CLI
  const model = node.data.hardwareModel
    ? getHardwareModel(node.data.hardwareModel)
    : undefined;
  const hasCli = model?.hasCli ?? false;

  if (!hasCli) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <Terminal size={32} className="text-gray-600 mb-3" />
        <p className="text-sm text-gray-400 font-medium">CLI Indisponível</p>
        <p className="text-[11px] text-gray-600 mt-1">
          Este dispositivo ({model?.modelName ?? node.data.deviceType}) não
          suporta terminal de comandos.
        </p>
      </div>
    );
  }

  const prompt = buildPrompt(cliState);

  return (
    <div
      className="flex flex-col h-full bg-slate-950"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border-b border-white/5">
        <Terminal size={12} className="text-green-400" />
        <span className="text-[10px] font-mono text-green-400">
          {model?.firmware ?? "CLI"}
        </span>
        <span className="text-[10px] text-gray-600 ml-auto font-mono">
          {cliState.mode.toUpperCase()}
        </span>
      </div>

      {/* Output Area */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-green-300 custom-scrollbar"
        role="log"
        aria-label="Saída do terminal"
        aria-live="polite"
      >
        {cliState.output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center px-3 py-2 border-t border-white/5 bg-slate-900/50"
      >
        <span className="text-green-400 font-mono text-[11px] flex-shrink-0 mr-1">
          {prompt}
        </span>
        <ChevronRight size={10} className="text-green-600 flex-shrink-0 mr-1" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Entrada de comando CLI"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-green-300 font-mono text-[11px] outline-none caret-green-400 placeholder-green-800"
          placeholder="Digite um comando..."
        />
      </form>
    </div>
  );
});

TerminalEmulator.displayName = "TerminalEmulator";
export default TerminalEmulator;
