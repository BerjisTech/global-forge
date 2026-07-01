import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getDashboardMetrics } from "../lib/analytics/aggregator.server";
import {
  formatCurrency,
  formatCompact,
  formatPercentage,
  calcConversionRate,
  countryFlag,
} from "../lib/utils/formatting";
import { SCOPE_ICONS, SCOPE_LABELS } from "../lib/utils/constants";
import dashStyles from "../styles/dashboard.module.css";
import analyticsStyles from "../styles/analytics.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("range") || "last_30";

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return {
      metrics: {
        totalRevenue: 0,
        conversionRate: 0,
        totalImpressions: 0,
        activePricingRules: 0,
        activeCountries: 0,
        avgDutySaved: 0,
        revenueByDay: [],
        topRules: [],
        topCountries: [],
      },
      allRules: [],
      dateRange,
    };
  }

  const metrics = await getDashboardMetrics(shop.id, dateRange);

  const allRules = await db.pricingRule.findMany({
    where: { shopId: shop.id },
    orderBy: { revenue: "desc" },
    select: {
      id: true,
      name: true,
      scope: true,
      status: true,
      impressions: true,
      conversions: true,
      revenue: true,
    },
  });

  return { metrics, allRules, dateRange };
};

export default function AnalyticsPage() {
  const { metrics, allRules, dateRange } = useLoaderData<typeof loader>();

  const maxRevenue = allRules.length > 0
    ? Math.max(...allRules.map((r: { revenue: number }) => r.revenue), 1)
    : 1;

  return (
    <s-page heading="Analytics">
      {/* Date Range Selector */}
      <s-section>
        <s-stack direction="inline" gap="base">
          {[
            { value: "today", label: "Today" },
            { value: "last_7", label: "7 days" },
            { value: "last_30", label: "30 days" },
            { value: "last_90", label: "90 days" },
          ].map((range) => (
            <s-button
              key={range.value}
              variant={dateRange === range.value ? "primary" : "tertiary"}
              href={`/app/analytics?range=${range.value}`}
            >
              {range.label}
            </s-button>
          ))}
        </s-stack>
      </s-section>

      {/* Overview Metrics */}
      <s-section>
        <div className={analyticsStyles["analytics-grid"]}>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Int'l Revenue</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatCurrency(metrics.totalRevenue)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Conversion Rate</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatPercentage(metrics.conversionRate, false)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Total Impressions</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatCompact(metrics.totalImpressions)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Active Countries</div>
            <div className={dashStyles["metric-card__value"]}>
              {metrics.activeCountries}
            </div>
          </div>
        </div>
      </s-section>

      {/* Revenue Chart */}
      <s-section heading="Revenue Over Time">
        <div className={analyticsStyles["chart-section"]}>
          {metrics.revenueByDay.length > 0 ? (
            <RevenueChart data={metrics.revenueByDay} />
          ) : (
            <div className={dashStyles["empty-state"]}>
              <div className={dashStyles["empty-state__icon"]}>📊</div>
              <div className={dashStyles["empty-state__title"]}>No data yet</div>
              <div className={dashStyles["empty-state__description"]}>
                Revenue data will appear once your pricing rules generate international conversions.
              </div>
            </div>
          )}
        </div>
      </s-section>

      {/* Country Performance */}
      {metrics.topCountries.length > 0 && (
        <s-section heading="Country Performance">
          <div className={analyticsStyles["country-grid"]}>
            {metrics.topCountries.map((country) => (
              <div key={country.countryCode} className={analyticsStyles["country-card"]}>
                <div className={analyticsStyles["country-card__header"]}>
                  <span className={analyticsStyles["country-card__flag"]}>
                    {countryFlag(country.countryCode)}
                  </span>
                  <span className={analyticsStyles["country-card__name"]}>
                    {country.countryName}
                  </span>
                </div>
                <div className={analyticsStyles["country-card__stat"]}>
                  <span>Revenue</span>
                  <span className={analyticsStyles["country-card__stat-value"]}>
                    {formatCurrency(country.revenue)}
                  </span>
                </div>
                <div className={analyticsStyles["country-card__stat"]}>
                  <span>Conversions</span>
                  <span className={analyticsStyles["country-card__stat-value"]}>
                    {formatCompact(country.conversions)}
                  </span>
                </div>
                <div className={analyticsStyles["country-card__stat"]}>
                  <span>Duty Saved</span>
                  <span className={analyticsStyles["country-card__stat-value"]}>
                    {formatCurrency(country.dutySaved)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </s-section>
      )}

      {/* Rule Performance Breakdown */}
      <s-section heading="Pricing Rule Performance">
        {allRules.length > 0 ? (
          <table className={analyticsStyles["breakdown-table"]}>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Impressions</th>
                <th>Conversions</th>
                <th>Conv. Rate</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {allRules.map((rule: {
                id: string;
                name: string;
                scope: string;
                status: string;
                impressions: number;
                conversions: number;
                revenue: number;
              }) => (
                <tr key={rule.id}>
                  <td>
                    <Link
                      to={`/app/pricing-rules/${rule.id}`}
                      className={analyticsStyles["breakdown-table__name"]}
                    >
                      {rule.name}
                    </Link>
                  </td>
                  <td>
                    {SCOPE_ICONS[rule.scope] || "🌍"}{" "}
                    {SCOPE_LABELS[rule.scope] || rule.scope}
                  </td>
                  <td>
                    <span
                      className={`${dashStyles["status-badge"]} ${
                        dashStyles[`status-badge--${rule.status}`]
                      }`}
                    >
                      {rule.status}
                    </span>
                  </td>
                  <td>{formatCompact(rule.impressions)}</td>
                  <td>{formatCompact(rule.conversions)}</td>
                  <td>
                    {formatPercentage(
                      calcConversionRate(rule.impressions, rule.conversions),
                      false,
                    )}
                  </td>
                  <td>
                    <div className={analyticsStyles["revenue-bar-wrapper"]}>
                      <div className={analyticsStyles["revenue-bar"]}>
                        <div
                          className={analyticsStyles["revenue-bar__fill"]}
                          style={{ width: `${(rule.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <div className={analyticsStyles["revenue-bar__value"]}>
                        {formatCurrency(rule.revenue)}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>📈</div>
            <div className={dashStyles["empty-state__title"]}>No analytics data</div>
            <div className={dashStyles["empty-state__description"]}>
              Create pricing rules and start selling internationally to see performance analytics here.
            </div>
            <s-button href="/app/pricing-rules/new">Create A Pricing Rule</s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

// ─── Revenue Chart (SVG) ───

function RevenueChart({ data }: { data: Array<{ date: string; revenue: number; conversions: number }> }) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const maxConversions = Math.max(...data.map((d) => d.conversions), 1);
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 60, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const revenuePoints = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (d.revenue / maxRevenue) * chartHeight,
    value: d.revenue,
    date: d.date,
  }));

  const conversionPoints = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (d.conversions / maxConversions) * chartHeight,
    value: d.conversions,
  }));

  const revenuePath = revenuePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`;

  const conversionPath = conversionPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="globalAnalyticsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0891b2" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padding.top + chartHeight - frac * chartHeight;
        return (
          <g key={frac}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              ${Math.round(maxRevenue * frac)}
            </text>
            <text x={width - padding.right + 8} y={y + 4} textAnchor="start" fontSize="10" fill="#94a3b8">
              {Math.round(maxConversions * frac)}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#globalAnalyticsGradient)" />

      {/* Revenue line */}
      <path d={revenuePath} fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" />

      {/* Conversions line */}
      <path d={conversionPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" />

      {/* Revenue data points */}
      {revenuePoints.map((p, i) => (
        <circle key={`r${i}`} cx={p.x} cy={p.y} r="3" fill="#0891b2" stroke="white" strokeWidth="1.5" />
      ))}

      {/* X-axis labels */}
      {revenuePoints
        .filter((_, i) => i % Math.max(Math.floor(revenuePoints.length / 6), 1) === 0)
        .map((p, i) => (
          <text key={i} x={p.x} y={height - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}

      {/* Legend */}
      <circle cx={padding.left} cy={height - 18} r="4" fill="#0891b2" />
      <text x={padding.left + 8} y={height - 14} fontSize="10" fill="#64748b">Revenue</text>
      <circle cx={padding.left + 80} cy={height - 18} r="4" fill="#6366f1" />
      <text x={padding.left + 88} y={height - 14} fontSize="10" fill="#64748b">Conversions</text>
    </svg>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
