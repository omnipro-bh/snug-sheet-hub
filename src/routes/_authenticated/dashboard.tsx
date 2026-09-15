import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Maximize2, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { getMyAccount, listMyDashboards } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Insight Portal" },
      { name: "description", content: "Your live reporting dashboards, prepared by your administrator." },
      { property: "og:title", content: "Dashboard — Insight Portal" },
      { property: "og:description", content: "Your live reporting dashboards." },
    ],
  }),
  component: Dashboard,
});

function toEmbedUrl(url: string) {
  if (url.includes("widget=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "widget=true&headers=false";
}

const ghostBtn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-panel transition hover:bg-accent disabled:opacity-60";
const field =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25";

function Dashboard() {
  const fetchAccount = useServerFn(getMyAccount);
  const fetchDashboards = useServerFn(listMyDashboards);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const dashboards = useQuery({ queryKey: ["my-dashboards"], queryFn: () => fetchDashboards() });

  const [reloadKey, setReloadKey] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = dashboards.data ?? [];
  useEffect(() => {
    const first = list[0];
    if (first && !list.some((d: any) => d.id === activeId)) setActiveId(first.id);
  }, [list, activeId]);

  const active = list.find((d: any) => d.id === activeId) ?? list[0];

  const profile = account.data?.profile;
  const initials = (profile?.full_name || profile?.username || "??").slice(0, 2).toUpperCase();

  return (
    <AppShell
      title="Dashboard"
      badge="Live"
      subtitle={profile?.full_name || profile?.username || "Account"}
      initials={initials}
      isAdmin={Boolean(account.data?.isAdmin)}
      actions={
        <>
          {account.data?.isAdmin ? (
            <Link to="/admin" className={ghostBtn}>
              <Users className="size-4" /> Manage users
            </Link>
          ) : null}
          <button onClick={() => setAdding((v) => !v)} className={ghostBtn}>
            <Plus className="size-4" /> Add dashboard
          </button>
          <button onClick={() => setReloadKey((k) => k + 1)} className={ghostBtn}>
            <RefreshCw className="size-4" /> Refresh
          </button>
          {active?.url ? (
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Maximize2 className="size-4" /> Open full view
            </a>
          ) : null}
        </>
      }
    >
      {adding ? (
        <form
          className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-panel"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="min-w-[180px] flex-1 text-xs font-medium text-muted-foreground">
            Dashboard name
            <input
              className={`${field} mt-1`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sales overview"
              required
            />
          </label>
          <label className="min-w-[260px] flex-[2] text-xs font-medium text-muted-foreground">
            Google Sheet published link
            <input
              className={`${field} mt-1`}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pubhtml"
              required
            />
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </button>
          <button type="button" onClick={() => setAdding(false)} className={ghostBtn}>
            <X className="size-4" /> Cancel
          </button>
        </form>
      ) : null}

      {list.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {list.map((d: any) => (
            <span
              key={d.id}
              className={`group inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                d.id === active?.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              <button onClick={() => setActiveId(d.id)} className="font-medium">
                {d.name}
              </button>
              <button
                onClick={() => deleteMutation.mutate(d.id)}
                title="Remove dashboard"
                className="opacity-0 transition group-hover:opacity-70 hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="h-[calc(100vh-160px)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        {dashboards.isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : active?.url ? (
          <iframe
            key={`${active.id}-${reloadKey}`}
            src={toEmbedUrl(active.url)}
            title={active.name}
            className="size-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">No dashboard yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one with “Add dashboard”, or ask your administrator to link a report.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
