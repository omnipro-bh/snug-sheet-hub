import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeUsername, usernameToEmail } from "@/lib/username";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(40, "Username must be less than 40 characters")
  .regex(/^[A-Za-z0-9._-]+$/, "Only letters, numbers, dot, dash and underscore");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters");

const urlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\/docs\.google\.com\//.test(v), {
    message: "Must be a https://docs.google.com/ link",
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, dashboard_url, is_active")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    return { profile, isAdmin: Boolean(isAdmin) };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, dashboard_url, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const adminIds = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

    return (data ?? []).map((p: any) => ({ ...p, is_admin: adminIds.has(p.id) }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        username: usernameSchema,
        password: passwordSchema,
        fullName: z.string().trim().max(120).optional().default(""),
        dashboardUrl: urlSchema.optional().default(""),
        isAdmin: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const username = normalizeUsername(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username,
      full_name: data.fullName || null,
      dashboard_url: data.dashboardUrl || null,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.isAdmin ? "admin" : "user" });

    return { ok: true as const, id: created.user.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().trim().max(120).optional(),
        dashboardUrl: urlSchema.optional(),
        isActive: z.boolean().optional(),
        password: z.union([passwordSchema, z.literal("")]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      full_name?: string | null;
      dashboard_url?: string | null;
      is_active?: boolean;
    } = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName || null;
    if (data.dashboardUrl !== undefined) patch.dashboard_url = data.dashboardUrl || null;
    if (data.isActive !== undefined) patch.is_active = data.isActive;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.id);

      if (error) throw new Error(error.message);
    }

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** One-time bootstrap: creates the very first admin, and only while none exists. */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ username: usernameSchema, password: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin account already exists");

    const username = normalizeUsername(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");

    await supabaseAdmin.from("profiles").insert({ id: created.user.id, username });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

    return { ok: true as const };
  });

/* ---------------------------------- Dashboards ---------------------------------- */

const dashboardUrlSchema = z
  .string()
  .trim()
  .min(1, "Dashboard link is required")
  .max(2000)
  .refine((v) => /^https:\/\/docs\.google\.com\//.test(v), {
    message: "Must be a https://docs.google.com/ link",
  });

const dashboardNameSchema = z.string().trim().min(1, "Name is required").max(80);

export const listMyDashboards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dashboards")
      .select("id, name, url, sort_order, created_at")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listUserDashboards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("dashboards")
      .select("id, user_id, name, url, sort_order, created_at")
      .eq("user_id", data.userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid().optional(),
        name: dashboardNameSchema,
        url: dashboardUrlSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Only admins can create dashboards (for themselves or any user).
    await assertAdmin(context);
    const targetId = data.userId ?? context.userId;

    const { error } = await context.supabase
      .from("dashboards")
      .insert({ user_id: targetId, name: data.name, url: data.url });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: dashboardNameSchema.optional(),
        url: dashboardUrlSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: { name?: string; url?: string } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.url !== undefined) patch.url = data.url;
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await context.supabase.from("dashboards").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dashboards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
