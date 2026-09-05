import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/username";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Insight Portal" },
      {
        name: "description",
        content:
          "Sign in with the username and password provided by your administrator to open your live reporting dashboard.",
      },
      { property: "og:title", content: "Sign in — Insight Portal" },
      {
        property: "og:description",
        content: "Secure access to your personal reporting dashboard.",
      },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Incorrect username or password.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen font-sans">
      <div className="hidden w-[42%] flex-col justify-between bg-sidebar p-10 lg:flex">
        <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
          Insight Portal
        </span>
        <div>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Your reporting, in one clean workspace.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">
            Each account opens straight into the live dashboard prepared for it.
          </p>
        </div>
        <span className="text-xs text-sidebar-foreground/50">Access is issued by your administrator.</span>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the username and password you were given.
          </p>

          <label className="mt-8 block text-sm font-medium text-foreground" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            maxLength={40}
            className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
          />

          <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={72}
            className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
          />

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
