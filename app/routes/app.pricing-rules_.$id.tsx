import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { formatCurrency, formatCompact, formatPercentage, countryFlag } from "../lib/utils/formatting";
import { safeJsonParse } from "../lib/utils/formatting";
import {
  SCOPE_ICONS,
  SCOPE_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  ROUNDING_LABELS,
  POPULAR_COUNTRIES,
} from "../lib/utils/constants";
import styles from "../styles/builder.module.css";
import dashStyles from "../styles/dashboard.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const ruleId = params.id;

  if (!ruleId) throw new Response("Not Found", { status: 404 });

  const rule = await db.pricingRule.findUnique({
    where: { id: ruleId },
    include: { shop: { select: { shopDomain: true } } },
  });

  if (!rule || rule.shop.shopDomain !== session.shop) {
    throw new Response("Not Found", { status: 404 });
  }

  return { rule };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const ruleId = params.id;

  if (!ruleId) return { error: "Rule not found" };

  const rule = await db.pricingRule.findUnique({
    where: { id: ruleId },
    include: { shop: { select: { shopDomain: true } } },
  });

  if (!rule || rule.shop.shopDomain !== session.shop) {
    return { error: "Rule not found" };
  }

  // Handle delete
  if (intent === "delete") {
    await db.pricingRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  }

  // Handle status toggle
  if (intent === "toggle-status") {
    const newStatus = rule.status === "active" ? "paused" : "active";
    await db.pricingRule.update({
      where: { id: ruleId },
      data: { status: newStatus },
    });
    return { success: true, newStatus };
  }

  // Handle update
  const name = formData.get("name") as string;
  if (!name || name.trim().length === 0) {
    return { error: "Rule name is required" };
  }

  await db.pricingRule.update({
    where: { id: ruleId },
    data: {
      name: name.trim(),
      scope: (formData.get("scope") as string) || "all",
      adjustmentType: (formData.get("adjustmentType") as string) || "percentage",
      adjustmentValue: parseFloat(formData.get("adjustmentValue") as string) || 0,
      includeDuty: formData.get("includeDuty") === "true",
      includeVat: formData.get("includeVat") === "true",
      dutyRate: formData.get("dutyRate") ? parseFloat(formData.get("dutyRate") as string) : null,
      vatRate: formData.get("vatRate") ? parseFloat(formData.get("vatRate") as string) : null,
      shippingCostType: (formData.get("shippingCostType") as string) || null,
      shippingFlatRate: formData.get("shippingFlatRate")
        ? parseFloat(formData.get("shippingFlatRate") as string)
        : null,
      roundingMethod: (formData.get("roundingMethod") as string) || "psychological",
      countries: (formData.get("countries") as string) || null,
      status: (formData.get("status") as string) || rule.status,
    },
  });

  return { success: true };
};

export default function EditPricingRulePage() {
  const { rule } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const [scope, setScope] = useState(rule.scope);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    safeJsonParse<string[]>(rule.countries, []),
  );
  const [adjustmentType, setAdjustmentType] = useState(rule.adjustmentType);
  const [includeDuty, setIncludeDuty] = useState(rule.includeDuty);
  const [includeVat, setIncludeVat] = useState(rule.includeVat);
  const [shippingType, setShippingType] = useState(rule.shippingCostType || "");

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Pricing rule updated!");
    }
    if (fetcher.data && "deleted" in fetcher.data && fetcher.data.deleted) {
      shopify.toast.show("Pricing rule deleted");
      navigate("/app/pricing-rules");
    }
  }, [fetcher.data, shopify, navigate]);

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <s-page heading={rule.name}>
      <s-button slot="secondary-action" href="/app/pricing-rules" variant="tertiary">
        ← Back
      </s-button>

      <s-section>
        <fetcher.Form method="post">
          {fetcher.data && "error" in fetcher.data && (
            <s-banner tone="critical">
              {fetcher.data.error}
            </s-banner>
          )}

          {/* Basic Info */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Basic Information</div>
            <div className={styles["form-field"]}>
              <label className={styles["form-field__label"]}>Rule Name</label>
              <input
                className={styles["form-field__input"]}
                type="text"
                name="name"
                defaultValue={rule.name}
                required
              />
            </div>
          </div>

          {/* Scope */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Product Scope</div>
            <div className={styles["scope-selector"]}>
              {Object.entries(SCOPE_ICONS).map(([key, icon]) => (
                <div
                  key={key}
                  className={`${styles["scope-card"]} ${
                    scope === key ? styles["scope-card--selected"] : ""
                  }`}
                  onClick={() => setScope(key)}
                >
                  <div className={styles["scope-card__icon"]}>{icon}</div>
                  <div className={styles["scope-card__label"]}>
                    {SCOPE_LABELS[key]}
                  </div>
                </div>
              ))}
            </div>
            <input type="hidden" name="scope" value={scope} />
          </div>

          {/* Country Targeting */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Country Targeting</div>
            <div className={styles["country-chips"]}>
              {POPULAR_COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  className={`${styles["country-chip"]} ${
                    selectedCountries.includes(country.code)
                      ? styles["country-chip--selected"]
                      : ""
                  }`}
                  onClick={() => toggleCountry(country.code)}
                >
                  {countryFlag(country.code)} {country.name}
                </div>
              ))}
            </div>
            <input
              type="hidden"
              name="countries"
              value={
                selectedCountries.length > 0
                  ? JSON.stringify(selectedCountries)
                  : ""
              }
            />
          </div>

          {/* Price Adjustment */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Price Adjustment</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Adjustment Type</label>
                <select
                  className={styles["form-field__select"]}
                  name="adjustmentType"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                >
                  {Object.entries(ADJUSTMENT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Value</label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="adjustmentValue"
                  step={adjustmentType === "multiplier" ? "0.01" : "1"}
                  defaultValue={rule.adjustmentValue}
                />
              </div>
            </div>
          </div>

          {/* Duties & Taxes */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Duties & Taxes</div>
            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>Include Duty</div>
              </div>
              <input
                type="checkbox"
                checked={includeDuty}
                onChange={(e) => setIncludeDuty(e.target.checked)}
              />
            </div>
            <input type="hidden" name="includeDuty" value={String(includeDuty)} />

            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>Include VAT / GST</div>
              </div>
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
            </div>
            <input type="hidden" name="includeVat" value={String(includeVat)} />

            <div className={styles["form-row"]} style={{ marginTop: "1rem" }}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Override Duty Rate (%)</label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="dutyRate"
                  step="0.1"
                  defaultValue={rule.dutyRate ?? ""}
                  placeholder="Auto"
                />
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Override VAT Rate (%)</label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="vatRate"
                  step="0.1"
                  defaultValue={rule.vatRate ?? ""}
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Shipping Cost</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Shipping Cost Type</label>
                <select
                  className={styles["form-field__select"]}
                  name="shippingCostType"
                  value={shippingType}
                  onChange={(e) => setShippingType(e.target.value)}
                >
                  <option value="">None</option>
                  <option value="flat">Flat Rate</option>
                  <option value="weight_based">Weight-based</option>
                  <option value="api">From API</option>
                </select>
              </div>
              {shippingType === "flat" && (
                <div className={styles["form-field"]}>
                  <label className={styles["form-field__label"]}>Flat Rate ($)</label>
                  <input
                    className={styles["form-field__input"]}
                    type="number"
                    name="shippingFlatRate"
                    step="0.01"
                    defaultValue={rule.shippingFlatRate ?? "0"}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rounding */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Price Rounding</div>
            <div className={styles["form-field"]}>
              <select
                className={styles["form-field__select"]}
                name="roundingMethod"
                defaultValue={rule.roundingMethod}
              >
                {Object.entries(ROUNDING_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Status</div>
            <select className={styles["form-field__select"]} name="status" defaultValue={rule.status}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
            <s-button variant="primary" type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Save Changes
            </s-button>
            <s-button variant="tertiary" href="/app/pricing-rules">
              Cancel
            </s-button>
          </div>
        </fetcher.Form>
      </s-section>

      {/* Performance */}
      <s-section slot="aside" heading="Performance">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Impressions</div>
            <div className={dashStyles["metric-card__value"]}>{formatCompact(rule.impressions)}</div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Conversions</div>
            <div className={dashStyles["metric-card__value"]}>{formatCompact(rule.conversions)}</div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Revenue</div>
            <div className={dashStyles["metric-card__value"]}>{formatCurrency(rule.revenue)}</div>
          </div>
        </div>
      </s-section>

      {/* Danger Zone */}
      <s-section slot="aside" heading="Danger Zone">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <s-button variant="tertiary" type="submit" tone="critical">
            Delete Rule
          </s-button>
        </fetcher.Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
