// ─── AppShell.tsx ────────────────────────────────────────────────────────────
// Layout principal v3.0 — navegação + Command Palette + Outlet para rotas.

import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Network,
  LayoutDashboard,
  Boxes,
  Wrench,
  Code2,
  Shield,
  DollarSign,
  LayoutTemplate,
  History,
  Command,
} from "lucide-react";
import CommandPalette, {
  useCommandPalette,
} from "@/components/CommandPalette/CommandPalette";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/redes", label: "Redes", icon: Network },
  { to: "/arch", label: "Arquitetura", icon: Boxes },
  { to: "/codegen", label: "CodeGen", icon: Code2 },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/cost", label: "Custos", icon: DollarSign },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/versions", label: "Versões", icon: History },
] as const;

const AppShell: React.FC = () => {
  const location = useLocation();
  const { isOpen, open, close } = useCommandPalette();
  const isToolPage =
    location.pathname.startsWith("/redes") ||
    location.pathname.startsWith("/arch");

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-gray-100 overflow-hidden">
      {/* ── Top Navigation Bar ──────────────────────────────────────────── */}
      <header className="h-12 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-4 z-50">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-2 text-sm font-bold tracking-wide text-cyan-400 hover:text-cyan-300 transition-colors mr-2"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">NetBuilder Academy</span>
        </NavLink>

        {/* Separator */}
        <div className="w-px h-5 bg-white/10" />

        {/* Navigation Links */}
        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex-1" />

        {/* Command Palette trigger */}
        <button
          onClick={open}
          aria-label="Abrir paleta de comandos (Ctrl+K)"
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-500 bg-white/5 border border-white/5 rounded-md hover:bg-white/10 hover:text-gray-300 transition-colors"
        >
          <Command className="w-3 h-3" />
          <span className="hidden sm:inline">Ctrl+K</span>
        </button>

        <span className="text-[10px] text-gray-600 font-mono">v3.0</span>
      </header>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-hidden ${isToolPage ? "" : "overflow-y-auto"}`}
      >
        <Outlet />
      </div>

      {/* ── Command Palette ─────────────────────────────────────────────── */}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </div>
  );
};

export default AppShell;
