import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { adminExists, createFirstAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Create admin account — Insight Portal" },
      { name: "description", content: "One-time setup of the administrator account for the portal." },
      { property: "og:title", content: "Create admin account — Insight Portal" },
      { property: "og:description", content: "One-time administrator setup." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(adminExists);
  const createAdmin = useServerFn(createFirstAdmin);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-exists"], queryFn: () => checkAdmin() });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-panel">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Administrator setup</h1>
        {isLoading ? (
          <div className="mt-6 flex justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : data?.exists ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              An administrator account already exists. Head to the sign-in page.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Go to sign in
            </button>
          </>
        ) : (
          <form
            className="mt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              try {
                await createAdmin({ data: { username, password } });
                await refetch();
                navigate({ to: "/" });
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm text-muted-foreground">
              Choose the username and password for your admin account. This page works only once.
            </p>
            <label className="mt-6 block text-sm font-medium text-foreground">Username</label>
            <input className={fieldClass} value={username} onChange={(e) => setUsername(e.target.value)} required />
            <label className="mt-4 block text-sm font-medium text-foreground">Password</label>
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create admin account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
