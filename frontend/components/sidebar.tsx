"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import {
  HouseFill,
  FileEarmarkPlus,
  FileEarmarkText,
  Stack,
  Calendar3,
  BarChartFill,
  Sliders,
  BoxArrowRight,
  ChevronLeft,
  ChevronRight,
  type Icon as BootstrapIcon,
} from "react-bootstrap-icons";

interface NavItem {
  href: string;
  label: string;
  icon: BootstrapIcon;
}

const SOLICITANTE_NAV: NavItem[] = [
  { href: "/home", label: "Início", icon: HouseFill },
  { href: "/new", label: "Nova solicitação", icon: FileEarmarkPlus },
  { href: "/my-requests", label: "Minhas solicitações", icon: FileEarmarkText },
  { href: "/queue", label: "Fila geral", icon: Stack },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HouseFill },
  { href: "/queue", label: "Fila geral", icon: Stack },
  { href: "/calendar", label: "Calendário", icon: Calendar3 },
  { href: "/my-requests", label: "Solicitações", icon: FileEarmarkText },
  { href: "/reports", label: "Relatórios", icon: BarChartFill },
];

const ADMIN_CONFIG_NAV: NavItem[] = [
  { href: "/settings/request-types", label: "Tipos & pesos", icon: Sliders },
  { href: "/settings/capacity", label: "Capacidade semanal", icon: Calendar3 },
];

const GESTOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HouseFill },
  { href: "/queue", label: "Fila geral", icon: Stack },
  { href: "/calendar", label: "Calendário", icon: Calendar3 },
  { href: "/reports", label: "Relatórios", icon: BarChartFill },
];

const COLLAPSE_STORAGE_KEY = "vm-sidebar-collapsed";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const mainNav = role === "solicitante" ? SOLICITANTE_NAV : role === "admin" ? ADMIN_NAV : GESTOR_NAV;
  const configNav = role === "admin" ? ADMIN_CONFIG_NAV : [];

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function renderLink(item: NavItem) {
    const active = pathname === item.href;
    const ItemIcon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          collapsed ? "justify-center" : ""
        } ${
          active
            ? "bg-vm-primary text-white shadow-md shadow-vm-primary/30"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <ItemIcon size={18} className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-vm-sidebar text-white transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`flex items-center gap-3 p-4 ${collapsed ? "flex-col" : ""}`}>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Central de Marketing</p>
            <p className="truncate text-xs text-slate-400">VendaMais</p>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        {!collapsed && (
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Menu</p>
        )}
        {mainNav.map(renderLink)}

        {configNav.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Configurações
              </p>
            )}
            {configNav.map(renderLink)}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          title={collapsed ? "Sair" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <BoxArrowRight size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
