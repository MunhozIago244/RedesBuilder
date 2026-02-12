// ─── CodeGeneratorPage.tsx ───────────────────────────────────────────────────
// Página completa do Code Generator com tabs por formato, preview e download.

import React, { useState, useMemo } from "react";
import {
  Code2,
  Copy,
  Download,
  Check,
  FileCode2,
  Container,
  Cloud,
  Server,
  AlertTriangle,
} from "lucide-react";
import type {
  GeneratorType,
  GeneratedArtifact,
  CanvasDiagram,
} from "@/types/platform";
import {
  generateSingle,
  generateAll,
} from "@/services/codegen/CodeGeneratorRegistry";
import {
  serializeArchDiagram,
  serializeNetworkDiagram,
} from "@/types/platform";
import { useArchStore } from "@/store/useArchStore";

// ═══════════════════════════════════════════════════════════════════════════════

const TABS: { id: GeneratorType; label: string; icon: React.ElementType }[] = [
  { id: "docker-compose", label: "Docker Compose", icon: Container },
  { id: "kubernetes", label: "Kubernetes", icon: Cloud },
  { id: "terraform", label: "Terraform", icon: Cloud },
  { id: "nginx", label: "Nginx", icon: Server },
  { id: "code-skeleton", label: "README", icon: FileCode2 },
];

// ═══════════════════════════════════════════════════════════════════════════════

const CodeGeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GeneratorType>("docker-compose");
  const [copied, setCopied] = useState(false);

  const { nodes, edges } = useArchStore();

  // Build CanvasDiagram from current arch store
  const diagram: CanvasDiagram | null = useMemo(() => {
    if (nodes.length === 0) return null;
    try {
      return serializeArchDiagram(nodes, edges, "Architecture Diagram");
    } catch {
      return null;
    }
  }, [nodes, edges]);

  const artifact: GeneratedArtifact | null = useMemo(() => {
    if (!diagram) return null;
    try {
      return generateSingle(activeTab, diagram);
    } catch {
      return null;
    }
  }, [diagram, activeTab]);

  const allResult = useMemo(() => {
    if (!diagram) return null;
    return generateAll(diagram);
  }, [diagram]);

  // ── Actions ──
  const handleCopy = () => {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.content).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        alert("Falha ao copiar. Tente selecionar e copiar manualmente.");
      },
    );
  };

  const handleDownload = () => {
    if (!artifact) return;
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    if (!allResult) return;
    // Stagger downloads to avoid browser popup blockers
    allResult.artifacts.forEach((art, index) => {
      setTimeout(() => {
        const blob = new Blob([art.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = art.filename;
        a.click();
        URL.revokeObjectURL(url);
      }, index * 300);
    });
  };

  // ── Render ──
  return (
    <div className="h-full flex flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold">Code Generator</h1>
          {diagram && (
            <span className="text-xs text-gray-600">
              ({diagram.components.length} componentes,{" "}
              {diagram.connections.length} conexões)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            disabled={!allResult}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 disabled:opacity-30 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab.id
                ? "text-emerald-400 border-emerald-400 bg-emerald-500/5"
                : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!diagram ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                Nenhum diagrama para gerar
              </p>
              <p className="text-xs text-gray-600">
                Crie componentes no <strong>Architecture Builder</strong>{" "}
                primeiro, depois volte aqui.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Warnings */}
            {allResult?.warnings && allResult.warnings.length > 0 && (
              <div className="mx-6 mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                {allResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-400"
                  >
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Code Preview */}
            <div className="flex-1 overflow-auto mx-6 my-3">
              <div className="relative">
                {/* Actions bar */}
                <div className="sticky top-0 flex items-center justify-between bg-slate-900/95 border border-white/5 rounded-t-lg px-3 py-2 z-10">
                  <span className="text-xs text-gray-500 font-mono">
                    {artifact?.filename ?? "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Code block */}
                <pre className="bg-slate-900/60 border border-t-0 border-white/5 rounded-b-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-5 whitespace-pre">
                  {artifact?.content ??
                    "# Selecione uma tab para gerar o código"}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeGeneratorPage;
