// ─── GlobalForge: Analytics Aggregator (Server-side) ───

import db from "../../db.server";
import type { DashboardMetrics } from "../pricing/types";

function getDateRangeStart(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "last_7":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "last_30":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "last_90":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function getDashboardMetrics(
  shopId: string,
  dateRange: string,
): Promise<DashboardMetrics> {
  const rangeStart = getDateRangeStart(dateRange);

  // Count active pricing rules and enabled countries
  const [activePricingRules, activeCountries] = await Promise.all([
    db.pricingRule.count({ where: { shopId, status: "active" } }),
    db.countryConfig.count({ where: { shopId, enabled: true } }),
  ]);

  // Aggregate analytics events in the date range
  const events = await db.analyticsEvent.findMany({
    where: {
      shopId,
      createdAt: { gte: rangeStart },
    },
    select: {
      eventType: true,
      revenue: true,
      dutySaved: true,
      createdAt: true,
      pricingRuleId: true,
      countryCode: true,
    },
  });

  const impressions = events.filter((e) => e.eventType === "impression").length;
  const conversions = events.filter((e) => e.eventType === "conversion");
  const totalRevenue = conversions.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalDutySaved = conversions.reduce((sum, e) => sum + (e.dutySaved || 0), 0);
  const avgDutySaved = conversions.length > 0 ? totalDutySaved / conversions.length : 0;
  const conversionRate =
    impressions > 0 ? (conversions.length / impressions) * 100 : 0;

  // Revenue by day
  const revenueMap = new Map<string, { revenue: number; conversions: number }>();
  for (const event of conversions) {
    const day = event.createdAt.toISOString().split("T")[0];
    const existing = revenueMap.get(day) || { revenue: 0, conversions: 0 };
    existing.revenue += event.revenue || 0;
    existing.conversions += 1;
    revenueMap.set(day, existing);
  }

  // Fill in missing days
  const revenueByDay: Array<{ date: string; revenue: number; conversions: number }> = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  for (let d = new Date(rangeStart); d <= now; d = new Date(d.getTime() + dayMs)) {
    const key = d.toISOString().split("T")[0];
    const data = revenueMap.get(key) || { revenue: 0, conversions: 0 };
    revenueByDay.push({ date: key, ...data });
  }

  // Top pricing rules by revenue
  const topRules = await db.pricingRule.findMany({
    where: { shopId },
    orderBy: { revenue: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      scope: true,
      impressions: true,
      conversions: true,
      revenue: true,
    },
  });

  // Top countries by conversion count
  const countryMap = new Map<string, { impressions: number; conversions: number; revenue: number; dutySaved: number }>();
  for (const event of events) {
    if (!event.countryCode) continue;
    const existing = countryMap.get(event.countryCode) || { impressions: 0, conversions: 0, revenue: 0, dutySaved: 0 };
    if (event.eventType === "impression") existing.impressions += 1;
    if (event.eventType === "conversion") {
      existing.conversions += 1;
      existing.revenue += event.revenue || 0;
      existing.dutySaved += event.dutySaved || 0;
    }
    countryMap.set(event.countryCode, existing);
  }

  // Look up country names from config
  const countryConfigs = await db.countryConfig.findMany({
    where: { shopId },
    select: { countryCode: true, countryName: true },
  });
  const countryNameMap = new Map(countryConfigs.map((c) => [c.countryCode, c.countryName]));

  const topCountries = Array.from(countryMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([code, data]) => ({
      countryCode: code,
      countryName: countryNameMap.get(code) || code,
      ...data,
    }));

  return {
    totalRevenue,
    conversionRate,
    totalImpressions: impressions,
    activePricingRules,
    activeCountries,
    avgDutySaved,
    revenueByDay,
    topRules: topRules.map((r) => ({
      ...r,
      conversionRate: r.impressions > 0 ? (r.conversions / r.impressions) * 100 : 0,
    })),
    topCountries,
  };
}
