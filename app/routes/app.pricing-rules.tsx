import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { formatCurrency, formatCompact, formatPercentage, calcConversionRate } from "../lib/utils/formatting";
import { SCOPE_ICONS, SCOPE_LABELS } from "../lib/utils/constants";
import dashStyles from "../styles/dashboard.module.css";
import rulesStyles from "../styles/rules.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  let shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    shop = await db.shop.create({
      data: { shopDomain: session.shop },
    });
  }

  const rules = await db.pricingRule.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      scope: true,
      status: true,
      adjustmentType: true,
      adjustmentValue: true,
      countries: true,
      impressions: true,
      conversions: true,
      revenue: true,
      updatedAt: true,
    },
  });

  return { rules };
};

export default function PricingRulesPage() {
  const { rules } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Pricing Rules">
      <s-button slot="primary-action" href="/app/pricing-rules/new">
        Create Rule
      </s-button>

      <s-section>
        {rules.length > 0 ? (
          <div className={rulesStyles["rules-list"]}>
            {rules.map((rule: {
              id: string;
              name: string;
              scope: string;
              status: string;
              adjustmentType: string;
              adjustmentValue: number;
              countries: string | null;
              impressions: number;
              conversions: number;
              revenue: number;
            }) => {
              const countryCount = rule.countries
                ? JSON.parse(rule.countries).length
                : 0;
              const adjustmentLabel =
                rule.adjustmentType === "percentage"
                  ? `${rule.adjustmentValue}%`
                  : rule.adjustmentType === "multiplier"
                  ? `×${rule.adjustmentValue}`
                  : formatCurrency(rule.adjustmentValue);

              return (
                <Link
                  key={rule.id}
                  to={`/app/pricing-rules/${rule.id}`}
                  className={rulesStyles["rule-card"]}
                >
                  <div className={rulesStyles["rule-card__icon"]}>
                    {SCOPE_ICONS[rule.scope] || "🌍"}
                  </div>
                  <div className={rulesStyles["rule-card__info"]}>
                    <div className={rulesStyles["rule-card__name"]}>
                      {rule.name}
                    </div>
                    <div className={rulesStyles["rule-card__meta"]}>
                      <span
                        className={`${dashStyles["status-badge"]} ${
                          dashStyles[`status-badge--${rule.status}`]
                        }`}
                      >
                        {rule.status}
                      </span>
                      <span>{SCOPE_LABELS[rule.scope] || rule.scope}</span>
                      <span>{adjustmentLabel} adjustment</span>
                      {countryCount > 0 && (
                        <span>
                          {countryCount} {countryCount === 1 ? "country" : "countries"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={rulesStyles["rule-card__stats"]}>
                    <div className={rulesStyles["rule-card__stat"]}>
                      <div className={rulesStyles["rule-card__stat-value"]}>
                        {formatCompact(rule.impressions)}
                      </div>
                      <div className={rulesStyles["rule-card__stat-label"]}>
                        Views
                      </div>
                    </div>
                    <div className={rulesStyles["rule-card__stat"]}>
                      <div className={rulesStyles["rule-card__stat-value"]}>
                        {formatPercentage(
                          calcConversionRate(rule.impressions, rule.conversions),
                          false,
                        )}
                      </div>
                      <div className={rulesStyles["rule-card__stat-label"]}>
                        Conv.
                      </div>
                    </div>
                    <div className={rulesStyles["rule-card__stat"]}>
                      <div className={rulesStyles["rule-card__stat-value"]}>
                        {formatCurrency(rule.revenue)}
                      </div>
                      <div className={rulesStyles["rule-card__stat-label"]}>
                        Revenue
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>🌍</div>
            <div className={dashStyles["empty-state__title"]}>No pricing rules yet</div>
            <div className={dashStyles["empty-state__description"]}>
              Create your first international pricing rule to automatically calculate duties, taxes, and suggest optimal pricing for your customers.
            </div>
            <s-button href="/app/pricing-rules/new">Create Your First Rule</s-button>
          </div>
        )}
      </s-section>

      <s-section slot="aside" heading="About Pricing Rules">
        <s-paragraph>
          <s-text>
            Pricing rules let you adjust product prices for specific countries or regions. Include duty, VAT, and shipping costs to show customers a final landed price and reduce cart abandonment.
          </s-text>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Tips">
        <s-unordered-list>
          <s-list-item>
            <s-text>Use psychological rounding (e.g., $49.99) to boost conversions</s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Include duties and VAT for a complete DDP price</s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Target specific product collections for granular control</s-text>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
