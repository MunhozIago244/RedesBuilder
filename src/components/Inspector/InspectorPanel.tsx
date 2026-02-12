// ─── Inspector Panel ────────────────────────────────────────────────────────
// Gaveta lateral para configurar propriedades de um dispositivo selecionado.
// CAMADA DE REALISMO: Abas Config/Portas/Console com terminal CLI lazy-loaded.
// AUDITORIA:
//   Estágio 1 — useEffect deps estabilizadas: JSON.stringify(selectedNode.data)
//   Estágio 3 — Validação de IP duplicado na rede ao salvar configuração.
//   Estágio 4 — aria-labels em botões, campo read-only explicitamente rotulado.

import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  memo,
} from "react";
import {
  X,
  Save,
  Trash2,
  Power,
  PowerOff,
  Link,
  Unlink,
  Info,
  Copy,
  Settings,
  Cable,
  Terminal,
} from "lucide-react";
import { useNetworkStore } from "@/store/useNetworkStore";
import type {
  NetworkDeviceData,
  DeviceStatus,
  LinkStatus,
} from "@/types/network";
import { isValidIp, isValidSubnetMask, maskToCidr } from "@/utils/ipUtils";
import { getHardwareModel } from "@/data/deviceLibrary";
import { usePortSummary } from "@/hooks/usePortManager";

// Lazy-load do Terminal Emulator
const TerminalEmulator = lazy(
  () => import("@/components/Terminal/TerminalEmulator"),
);

type InspectorTab = "config" | "ports" | "console";

// ─── Field Component ────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  readOnly?: boolean;
  mono?: boolean;
}

const Field: React.FC<FieldProps> = memo(
  ({ label, value, onChange, placeholder, error, readOnly, mono }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${label}` : undefined}
        className={`
        w-full px-3 py-2 rounded-lg text-sm
        bg-slate-800/60 border
        ${error ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-cyan-500/40"}
        ${readOnly ? "text-gray-500 cursor-not-allowed" : "text-gray-200"}
        ${mono ? "font-mono text-xs" : ""}
        placeholder-gray-600
        focus:outline-none focus:ring-1
        ${error ? "focus:ring-red-500/20" : "focus:ring-cyan-500/20"}
        transition-all
      `}
      />
      {error && (
        <span
          id={`error-${label}`}
          className="text-[9px] text-red-400"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  ),
);

Field.displayName = "Field";

// ─── Toggle Button ──────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  activeLabel: string;
  inactiveLabel: string;
  active: boolean;
  onToggle: () => void;
  activeColor: string;
  inactiveColor: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}

const Toggle: React.FC<ToggleProps> = memo(
  ({
    label,
    activeLabel,
    inactiveLabel,
    active,
    onToggle,
    activeColor,
    inactiveColor,
    activeIcon,
    inactiveIcon,
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <button
        onClick={onToggle}
        aria-label={`${label}: ${active ? activeLabel : inactiveLabel}. Clique para alternar.`}
        aria-pressed={active}
        className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        border transition-all duration-200
        ${
          active
            ? `${activeColor} border-green-500/30`
            : `${inactiveColor} border-red-500/30`
        }
      `}
      >
        {active ? activeIcon : inactiveIcon}
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  ),
);

Toggle.displayName = "Toggle";

// ─── Main Component ─────────────────────────────────────────────────────────

const InspectorPanel: React.FC = () => {
  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId);
  const nodes = useNetworkStore((s) => s.nodes);
  const updateNodeData = useNetworkStore((s) => s.updateNodeData);
  const removeNode = useNetworkStore((s) => s.removeNode);
  const selectNode = useNetworkStore((s) => s.selectNode);
  const disconnectPort = useNetworkStore((s) => s.disconnectPort);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Tab state
  const [activeTab, setActiveTab] = useState<InspectorTab>("config");

  // Port summary (memoized)
  const portSummary = usePortSummary(selectedNodeId);

  // Hardware model info
  const hwModel = selectedNode?.data.hardwareModel
    ? getHardwareModel(selectedNode.data.hardwareModel)
    : undefined;

  // Form state local — sincronizado com o nó
  const [formData, setFormData] = useState<Partial<NetworkDeviceData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // ESTÁGIO 1 FIX: JSON.stringify estabiliza a referência do dep
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (selectedNode) {
      const serialized = JSON.stringify(selectedNode.data);
      if (serialized !== prevDataRef.current) {
        prevDataRef.current = serialized;
        setFormData({
          label: selectedNode.data.label,
          ipAddress: selectedNode.data.ipAddress,
          subnetMask: selectedNode.data.subnetMask,
          macAddress: selectedNode.data.macAddress,
          gateway: selectedNode.data.gateway,
          status: selectedNode.data.status,
          linkStatus: selectedNode.data.linkStatus,
        });
        setErrors({});
      }
    }
  }, [selectedNode]);

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab("config");
  }, [selectedNodeId]);

  if (!selectedNodeId || !selectedNode) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.ipAddress && !isValidIp(formData.ipAddress)) {
      newErrors.ipAddress = "IPv4 inválido (ex: 192.168.1.10)";
    }
    if (formData.subnetMask && !isValidSubnetMask(formData.subnetMask)) {
      newErrors.subnetMask = "Máscara inválida (ex: 255.255.255.0)";
    }
    if (
      formData.gateway &&
      formData.gateway !== "0.0.0.0" &&
      !isValidIp(formData.gateway)
    ) {
      newErrors.gateway = "Gateway inválido";
    }

    // ESTÁGIO 3: Verificar IP duplicado na rede — outro dispositivo já usa este IP?
    if (formData.ipAddress && isValidIp(formData.ipAddress)) {
      const duplicate = nodes.find(
        (n) =>
          n.id !== selectedNodeId &&
          n.data.ipAddress === formData.ipAddress &&
          n.data.ipAddress !== "", // ignorar IPs vazios
      );
      if (duplicate) {
        newErrors.ipAddress = `IP já em uso por "${duplicate.data.label}"`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    updateNodeData(selectedNodeId, formData);
  };

  const handleDelete = () => {
    removeNode(selectedNodeId);
  };

  const handleClose = () => {
    selectNode(null);
  };

  const toggleStatus = () => {
    const newStatus: DeviceStatus =
      formData.status === "online" ? "offline" : "online";
    setFormData((prev) => ({ ...prev, status: newStatus }));
    updateNodeData(selectedNodeId, { status: newStatus });
  };

  const toggleLink = () => {
    const newLink: LinkStatus = formData.linkStatus === "up" ? "down" : "up";
    setFormData((prev) => ({ ...prev, linkStatus: newLink }));
    updateNodeData(selectedNodeId, { linkStatus: newLink });
  };

  const copyMac = () => {
    navigator.clipboard.writeText(formData.macAddress ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cidrNotation =
    formData.subnetMask && isValidSubnetMask(formData.subnetMask)
      ? `/${maskToCidr(formData.subnetMask)}`
      : "";

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-gray-100">Inspector</h2>
          {hwModel && (
            <span className="text-[9px] font-mono text-gray-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
              {hwModel.modelName}
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-slate-800 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Fechar painel Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b border-white/5"
        role="tablist"
        aria-label="Abas do Inspector"
      >
        <button
          role="tab"
          aria-selected={activeTab === "config"}
          onClick={() => setActiveTab("config")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all border-b-2 ${
            activeTab === "config"
              ? "text-cyan-400 border-cyan-400 bg-cyan-400/5"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          <Settings size={12} /> Config
        </button>
        {portSummary.total > 0 && (
          <button
            role="tab"
            aria-selected={activeTab === "ports"}
            onClick={() => setActiveTab("ports")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all border-b-2 ${
              activeTab === "ports"
                ? "text-cyan-400 border-cyan-400 bg-cyan-400/5"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            <Cable size={12} /> Portas
            <span className="text-[9px] font-mono bg-slate-800 px-1 rounded">
              {portSummary.connected}/{portSummary.total}
            </span>
          </button>
        )}
        {hwModel?.hasCli && (
          <button
            role="tab"
            aria-selected={activeTab === "console"}
            onClick={() => setActiveTab("console")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all border-b-2 ${
              activeTab === "console"
                ? "text-green-400 border-green-400 bg-green-400/5"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            <Terminal size={12} /> Console
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "console" && hwModel?.hasCli ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Carregando terminal...
            </div>
          }
        >
          <TerminalEmulator nodeId={selectedNodeId} />
        </Suspense>
      ) : activeTab === "ports" ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Interfaces Físicas
          </h3>
          {selectedNode.data.interfaces.map((iface) => (
            <div
              key={iface.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-white/5"
              role="listitem"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  iface.connectedEdgeId
                    ? "bg-green-400"
                    : iface.adminUp
                      ? "bg-gray-600"
                      : "bg-red-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-gray-200 truncate">
                  {iface.shortName}
                </div>
                <div className="text-[9px] text-gray-500">
                  {iface.speed} {iface.type.toUpperCase()}
                  {iface.poe !== "none"
                    ? ` • PoE ${iface.poe === "in" ? "↓" : "↑"}`
                    : ""}
                  {iface.lacpGroup ? ` • LACP:${iface.lacpGroup}` : ""}
                  {iface.ipConfig ? ` • ${iface.ipConfig.address}` : ""}
                </div>
              </div>
              {iface.connectedEdgeId && (
                <button
                  onClick={() => disconnectPort(selectedNodeId, iface.id)}
                  className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  aria-label={`Desconectar ${iface.shortName}`}
                >
                  Desconectar
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Config Tab — conteúdo original */
        <>
          {/* Form */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
            {/* Device Info Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase">Tipo:</span>
              <span className="text-xs font-mono text-cyan-400">
                {selectedNode.data.deviceType}
              </span>
              <span className="text-[10px] text-gray-500 ml-auto uppercase">
                ID:
              </span>
              <span className="text-[9px] font-mono text-gray-600 truncate max-w-[80px]">
                {selectedNodeId}
              </span>
            </div>

            {/* Label */}
            <Field
              label="Nome do Dispositivo"
              value={formData.label ?? ""}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, label: val }))
              }
              placeholder="Nome do dispositivo"
            />

            {/* IP Configuration */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-px bg-cyan-500/30" />
                Configuração IP
                {cidrNotation && (
                  <span className="text-cyan-500 font-mono">
                    {cidrNotation}
                  </span>
                )}
              </h3>

              <Field
                label="Endereço IP"
                value={formData.ipAddress ?? ""}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, ipAddress: val }))
                }
                placeholder="192.168.1.10"
                error={errors.ipAddress}
                mono
              />

              <Field
                label="Máscara de Sub-rede"
                value={formData.subnetMask ?? ""}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, subnetMask: val }))
                }
                placeholder="255.255.255.0"
                error={errors.subnetMask}
                mono
              />

              <Field
                label="Gateway Padrão"
                value={formData.gateway ?? ""}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, gateway: val }))
                }
                placeholder="192.168.1.1"
                error={errors.gateway}
                mono
              />
            </div>

            {/* MAC Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                MAC Address
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.macAddress ?? ""}
                  readOnly
                  aria-label="MAC Address (somente leitura)"
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-slate-800/60 border border-white/5 text-gray-500 cursor-not-allowed"
                />
                <button
                  onClick={copyMac}
                  className="p-2 rounded-lg bg-slate-800/60 border border-white/5 hover:border-cyan-500/30 text-gray-500 hover:text-cyan-400 transition-all"
                  title="Copiar MAC"
                  aria-label="Copiar endereço MAC para área de transferência"
                >
                  <Copy size={14} />
                </button>
              </div>
              {copied && (
                <span
                  className="text-[9px] text-green-400"
                  role="status"
                  aria-live="polite"
                >
                  Copiado!
                </span>
              )}
            </div>

            {/* Status Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <Toggle
                label="Status"
                activeLabel="Online"
                inactiveLabel="Offline"
                active={formData.status === "online"}
                onToggle={toggleStatus}
                activeColor="bg-green-500/10 text-green-400"
                inactiveColor="bg-red-500/10 text-red-400"
                activeIcon={<Power size={14} />}
                inactiveIcon={<PowerOff size={14} />}
              />
              <Toggle
                label="Link"
                activeLabel="Up"
                inactiveLabel="Down"
                active={formData.linkStatus === "up"}
                onToggle={toggleLink}
                activeColor="bg-cyan-500/10 text-cyan-400"
                inactiveColor="bg-yellow-500/10 text-yellow-400"
                activeIcon={<Link size={14} />}
                inactiveIcon={<Unlink size={14} />}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-3 border-t border-white/5 space-y-2">
            <button
              onClick={handleSave}
              aria-label="Salvar configuração do dispositivo"
              className="
            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
            bg-cyan-500/20 text-cyan-400 font-medium text-sm
            border border-cyan-500/30 hover:bg-cyan-500/30
            transition-all duration-200
          "
            >
              <Save size={14} />
              Salvar Configuração
            </button>
            <button
              onClick={handleDelete}
              aria-label="Remover dispositivo da topologia"
              className="
            w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
            bg-red-500/10 text-red-400 font-medium text-sm
            border border-red-500/20 hover:bg-red-500/20
            transition-all duration-200
          "
            >
              <Trash2 size={14} />
              Remover Dispositivo
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InspectorPanel;
