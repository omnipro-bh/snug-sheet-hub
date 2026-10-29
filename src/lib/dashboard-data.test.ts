import { describe, expect, test } from "bun:test";
import { resolveAssignedDashboards } from "./dashboard-data";

const profile = {
  id: "assigned-user",
  dashboard_url: "https://docs.google.com/spreadsheets/d/example/pubhtml",
  created_at: "2026-10-29T00:00:00Z",
};

describe("assigned dashboard reads", () => {
  test("reads the original profile report when there are no named dashboards", () => {
    expect(resolveAssignedDashboards([], profile)).toEqual([{
      id: "profile-assigned-user", name: "Main dashboard", url: profile.dashboard_url,
      sort_order: 0, created_at: profile.created_at,
    }]);
  });

  test("keeps named dashboard assignments instead of duplicating the profile report", () => {
    const rows = [{ id: "named", name: "Sales", url: profile.dashboard_url, sort_order: 0, created_at: profile.created_at }];
    expect(resolveAssignedDashboards(rows, profile)).toEqual(rows);
  });

  test("does not invent a dashboard when no report is assigned", () => {
    expect(resolveAssignedDashboards([], { ...profile, dashboard_url: null })).toEqual([]);
    expect(resolveAssignedDashboards([], null)).toEqual([]);
  });
});