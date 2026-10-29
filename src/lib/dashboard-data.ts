export type AssignedDashboard = {
  id: string;
  name: string;
  url: string;
  sort_order: number;
  created_at: string;
};

/** Preserve the original single-report assignment when no named reports exist. */
export function resolveAssignedDashboards(
  rows: AssignedDashboard[],
  profile: { id: string; dashboard_url: string | null; created_at: string } | null,
): AssignedDashboard[] {
  if (rows.length > 0) return rows;
  const url = profile?.dashboard_url?.trim();
  if (!profile || !url) return [];
  return [{
    id: `profile-${profile.id}`,
    name: "Main dashboard",
    url,
    sort_order: 0,
    created_at: profile.created_at,
  }];
}