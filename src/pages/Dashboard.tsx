// ─── Dashboard.tsx ───────────────────────────────────────────────────────────
// Página inicial do NetBuilder Academy — hub de ferramentas disponíveis.

import React from "react";
import { Link } from "react-router-dom";
import {
  Network,
  Boxes,
  ArrowRight,
  Cpu,
  Globe,
  Server,
  Workflow,
  DatabaseZap,
  Layers,
  Code2,
  Shield,
  DollarSign,
  LayoutTemplate,
  History,
} from "lucide-react";

interface ToolCard {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  to: string;
  tags: string[];
  status: "disponível" | "em breve";
}

const TOOLS: ToolCard[] = [
  {
    title: "Network Builder",
    description:
      "Projete topologias de rede com roteadores, switches, access points, firewalls e dispositivos IoT. Simule tráfego, analise banda e valide conexões em tempo real.",
    icon: Network,
    gradient: "from-cyan-500/20 to-blue-600/20",
    to: "/redes",
    tags: ["Topologia", "TCP/IP", "IoT", "Simulação"],
    status: "disponível",
  },
  {
    title: "Architecture Builder",
    description:
      "Crie diagramas de arquitetura de software — frontend, backend, APIs, bancos de dados, filas, CDN, microsserviços. Visualize fluxos de dados e protocolos de comunicação.",
    icon: Boxes,
    gradient: "from-violet-500/20 to-purple-600/20",
    to: "/arch",
    tags: ["Frontend", "Backend", "API", "Microsserviços"],
    status: "disponível",
  },
  {
    title: "Code Generator",
    description:
      "Gere código real a partir dos seus diagramas — Docker Compose, Kubernetes, Terraform e Nginx. Exporte e baixe artefatos prontos para deploy.",
    icon: Code2,
    gradient: "from-emerald-500/20 to-teal-600/20",
    to: "/codegen",
    tags: ["Docker", "K8s", "Terraform", "Nginx"],
    status: "disponível",
  },
  {
    title: "Security Analyzer",
    description:
      "Analise vulnerabilidades nos seus diagramas com 9+ regras de segurança. Score de 0‑100, grau A‑F, recomendações acionáveis por severidade.",
    icon: Shield,
    gradient: "from-red-500/20 to-orange-600/20",
    to: "/security",
    tags: ["Vulnerabilidades", "Score", "Regras"],
    status: "disponível",
  },
  {
    title: "Cost Estimator",
    description:
      "Compare custos entre AWS, Azure e GCP em tempo real. Visualize breakdown por componente e receba dicas de otimização para reduzir gastos.",
    icon: DollarSign,
    gradient: "from-yellow-500/20 to-amber-600/20",
    to: "/cost",
    tags: ["AWS", "Azure", "GCP", "Otimização"],
    status: "disponível",
  },
  {
    title: "Template Gallery",
    description:
      "Comece rápido com templates pré-configurados — Three‑Tier, Microsserviços, Serverless, IoT, Data Center e muito mais. Aplique com um clique.",
    icon: LayoutTemplate,
    gradient: "from-pink-500/20 to-rose-600/20",
    to: "/templates",
    tags: ["Templates", "Quick Start", "Patterns"],
    status: "disponível",
  },
  {
    title: "Version History",
    description:
      "Histórico completo com auto-save a cada 30s. Restaure qualquer versão anterior, compare diffs e nunca perca seu trabalho.",
    icon: History,
    gradient: "from-sky-500/20 to-indigo-600/20",
    to: "/versions",
    tags: ["Histórico", "Restore", "Auto-save"],
    status: "disponível",
  },
];

const FEATURES = [
  { icon: Cpu, label: "Drag & Drop intuitivo" },
  { icon: Globe, label: "Conexões inteligentes" },
  { icon: Server, label: "Componentes realistas" },
  { icon: Workflow, label: "Fluxo de dados visual" },
  { icon: DatabaseZap, label: "Indicadores de tráfego" },
  { icon: Layers, label: "Exportar diagramas" },
];

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-full bg-slate-950 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-3">
            NetBuilder Academy
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            Plataforma visual para projetar, simular e documentar infraestrutura
            de redes e arquitetura de software. Escolha uma ferramenta para
            começar.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className={`group relative rounded-2xl border border-white/5 bg-gradient-to-br ${tool.gradient} p-6 hover:border-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30`}
            >
              {/* Status Badge */}
              <span
                className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  tool.status === "disponível"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {tool.status}
              </span>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                  <tool.icon className="w-6 h-6 text-white/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white mb-1.5 flex items-center gap-2">
                    {tool.title}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    {tool.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Features Grid */}
        <div className="text-center mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-6">
            Recursos da Plataforma
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
