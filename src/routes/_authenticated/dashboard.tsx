import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Maximize2, RefreshCw, Users } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { getMyAccount } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Insight Portal" },
      { name: "description", content: "Your live reporting dashboard, prepared by your administrator." },
      { property: "og:title", content: "Dashboard — Insight Portal" },
      { property: "og:description", content: "Your live reporting dashboard." },
    ],
  }),
  component: Dashboard,
});

function toEmbedUrl(url: string) {
  if (url.includes("widget=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "widget=true&headers=false";
}

function Dashboard() {
  const fetchAccount = useServerFn(getMyAccount);
  const { data, isLoading } = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const [reloadKey, setReloadKey] = useState(0);

  const profile = data?.profile;
  const initials = (profile?.full_name || profile?.username || "??").slice(0, 2).toUpperCase();

  return (
    <AppShell
      title="Dashboard"
      badge="Live"
      subtitle={profile?.full_name || profile?.username || "Account"}
      initials={initials}
      isAdmin={data?.isAdmin}
      actions={
        <>
          {data?.isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-panel transition hover:bg-accent"
            >
              <Users className="size-4" /> Manage users
            </Link>
          ) : null}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-panel transition hover:bg-accent"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          {profile?.dashboard_url ? (
            <a
              href={profile.dashboard_url}
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
      <div className="h-[calc(100vh-116px)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : profile?.dashboard_url ? (
          <iframe
            key={reloadKey}
            src={toEmbedUrl(profile.dashboard_url)}
            title="Dashboard"
            className="size-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-foreground">No dashboard assigned yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your administrator hasn't linked a report to this account.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
