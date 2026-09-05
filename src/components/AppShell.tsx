import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CircleHelp,
  Code2,
  FolderClosed,
  Home,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessagesSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { icon: typeof Home; label: string; to?: string };

const primaryNav: NavItem[] = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: MessagesSquare, label: "Conversations" },
  { icon: Megaphone, label: "Campaigns" },
  { icon: LayoutGrid, label: "Funnels" },
  { icon: Users, label: "Users", to: "/admin" },
  { icon: FolderClosed, label: "Files" },
  { icon: Code2, label: "Developers" },
  { icon: Settings, label: "Settings" },
  { icon: CircleHelp, label: "Help" },
];

export function AppShell({
  title,
  badge,
  subtitle,
  actions,
  children,
  initials,
  isAdmin,
}: {
  title: string;
  badge?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  initials: string;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <aside className="sticky top-0 flex h-screen w-[52px] shrink-0 flex-col items-center gap-1 bg-sidebar py-3">
        <div className="relative mb-3 flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
          {initials}
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-success ring-2 ring-sidebar" />
        </div>
        {primaryNav.map((item) => {
          const active = item.to ? pathname === item.to : false;
          const disabled = !item.to || (item.to === "/admin" && !isAdmin);
          const className = cn(
            "flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors",
            active && "bg-sidebar-accent text-sidebar-accent-foreground",
            disabled ? "opacity-45" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          );
          if (disabled || !item.to) {
            return (
              <span key={item.label} title={item.label} className={className} aria-hidden>
                <item.icon className="size-[18px]" />
              </span>
            );
          }
          return (
            <Link key={item.label} to={item.to} title={item.label} className={className}>
              <item.icon className="size-[18px]" />
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1">
          <span className="relative flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70">
            <Bell className="size-[18px]" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
          </span>
          <span className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70">
            <Search className="size-[18px]" />
          </span>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 px-6 py-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
          {badge ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          ) : null}
          {subtitle ? (
            <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-panel">
              <span className="size-2 rounded-full bg-primary" />
              {subtitle}
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
        </header>
        <main className="min-w-0 flex-1 px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
