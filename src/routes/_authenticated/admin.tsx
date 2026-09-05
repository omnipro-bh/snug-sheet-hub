import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { createUser, deleteUser, getMyAccount, listUsers, updateUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Users — Insight Portal" },
      { name: "description", content: "Create accounts and assign each one its reporting dashboard." },
      { property: "og:title", content: "Users — Insight Portal" },
      { property: "og:description", content: "Create accounts and assign dashboards." },
    ],
  }),
  component: AdminPage,
});

const panel = "rounded-xl border border-border bg-card shadow-panel";
const field =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25";
const ghostBtn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60";

function AdminPage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchUsers = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
    enabled: Boolean(account.data?.isAdmin),
  });

  const [form, setForm] = useState({ username: "", password: "", fullName: "", dashboardUrl: "" });

  const createMutation = useMutation({
    mutationFn: (input: typeof form) =>
      create({
        data: {
          username: input.username,
          password: input.password,
          fullName: input.fullName,
          dashboardUrl: input.dashboardUrl,
        },
      }),
    onSuccess: () => {
      toast.success("Account created");
      setForm({ username: "", password: "", fullName: "", dashboardUrl: "" });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; dashboardUrl?: string; password?: string; isActive?: boolean }) =>
      update({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Account removed");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (account.data?.profile?.username || "??").slice(0, 2).toUpperCase();

  if (account.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!account.data?.isAdmin) {
    return (
      <AppShell title="Users" initials={initials}>
        <div className={`${panel} p-8 text-center`}>
          <p className="text-sm font-medium text-foreground">Administrators only</p>
          <p className="mt-1 text-sm text-muted-foreground">This area isn't available for your account.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Users"
      badge="Admin"
      initials={initials}
      isAdmin
      actions={
        <Link to="/dashboard" className={ghostBtn}>
          <LayoutDashboard className="size-4" /> My dashboard
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className={`${panel} h-fit p-5`}>
          <h2 className="text-sm font-semibold text-foreground">New account</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Set the username and password the person will use to sign in.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <input
              className={field}
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder="Password (min 8 characters)"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder="Full name (optional)"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <textarea
              className={`${field} min-h-[84px]`}
              placeholder="Google Sheet published link (https://docs.google.com/...)"
              value={form.dashboardUrl}
              onChange={(e) => setForm({ ...form, dashboardUrl: e.target.value })}
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create account
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {users.isLoading ? (
            <div className={`${panel} flex items-center justify-center p-10 text-muted-foreground`}>
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (users.data ?? []).length === 0 ? (
            <div className={`${panel} p-10 text-center text-sm text-muted-foreground`}>
              No accounts yet — create the first one on the left.
            </div>
          ) : (
            (users.data ?? []).map((u: any) => (
              <UserCard
                key={u.id}
                user={u}
                saving={updateMutation.isPending}
                deleting={deleteMutation.isPending}
                onSave={(patch) => updateMutation.mutate({ id: u.id, ...patch })}
                onDelete={() => deleteMutation.mutate(u.id)}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function UserCard({
  user,
  saving,
  deleting,
  onSave,
  onDelete,
}: {
  user: any;
  saving: boolean;
  deleting: boolean;
  onSave: (patch: { dashboardUrl?: string; password?: string; isActive?: boolean }) => void;
  onDelete: () => void;
}) {
  const [dashboardUrl, setDashboardUrl] = useState<string>(user.dashboard_url ?? "");
  const [password, setPassword] = useState("");

  return (
    <article className={`${panel} p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {(user.full_name || user.username).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user.full_name || user.username}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        {user.is_admin ? (
          <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
            Admin
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`size-2 rounded-full ${user.is_active ? "bg-success" : "bg-muted-foreground"}`} />
          {user.is_active ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          Dashboard link
          <textarea
            className={`${field} mt-1 min-h-[64px]`}
            value={dashboardUrl}
            onChange={(e) => setDashboardUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/e/.../pubhtml"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          New password (optional)
          <input
            className={`${field} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={saving}
          onClick={() => {
            onSave({ dashboardUrl, ...(password ? { password } : {}) });
            setPassword("");
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Save className="size-4" /> Save
        </button>
        <button disabled={saving} onClick={() => onSave({ isActive: !user.is_active })} className={ghostBtn}>
          {user.is_active ? "Disable" : "Enable"}
        </button>
        {dashboardUrl ? (
          <a href={dashboardUrl} target="_blank" rel="noreferrer" className={ghostBtn}>
            <ExternalLink className="size-4" /> View dashboard
          </a>
        ) : null}
        <button
          disabled={deleting}
          onClick={() => onDelete()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
        >
          <Trash2 className="size-4" /> Delete
        </button>
      </div>
    </article>
  );
}
