// ─── Error Boundary ─────────────────────────────────────────────────────────
// Captura erros de renderização React para impedir crash total da aplicação.
// MOTIVO: Sem Error Boundaries, um erro em qualquer componente derruba toda a UI.
// Adicionado no Estágio 3 (Robustez) do protocolo de auditoria.

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Label amigável da seção protegida (ex: "Canvas", "Inspector") */
  section: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log para debugging — em produção, enviar para serviço de monitoramento
    console.error(
      `[ErrorBoundary:${this.props.section}]`,
      error,
      info.componentStack,
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={32} className="text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-200 mb-1">
              Erro no {this.props.section}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs">
              {this.state.error?.message ?? "Ocorreu um erro inesperado."}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800/60 border border-white/10 text-gray-300 hover:bg-slate-700/60 hover:text-white transition-all"
            aria-label={`Tentar novamente seção ${this.props.section}`}
          >
            <RotateCcw size={14} />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
