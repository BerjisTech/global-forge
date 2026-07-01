import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { countryFlag } from "../lib/utils/formatting";
import {
  SCOPE_ICONS,
  SCOPE_LABELS,
  ADJUSTMENT_TYPE_LABELS,
  ROUNDING_LABELS,
  POPULAR_COUNTRIES,
} from "../lib/utils/constants";
import styles from "../styles/builder.module.css";

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

  return { shopId: shop.id, roundingMethod: shop.roundingMethod };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  const name = formData.get("name") as string;
  if (!name || name.trim().length === 0) {
    return { error: "Rule name is required" };
  }

  const scope = (formData.get("scope") as string) || "all";
  const adjustmentType = (formData.get("adjustmentType") as string) || "percentage";
  const adjustmentValue = parseFloat(formData.get("adjustmentValue") as string) || 0;
  const includeDuty = formData.get("includeDuty") === "true";
  const includeVat = formData.get("includeVat") === "true";
  const dutyRate = formData.get("dutyRate") ? parseFloat(formData.get("dutyRate") as string) : null;
  const vatRate = formData.get("vatRate") ? parseFloat(formData.get("vatRate") as string) : null;
  const shippingCostType = (formData.get("shippingCostType") as string) || null;
  const shippingFlatRate = formData.get("shippingFlatRate")
    ? parseFloat(formData.get("shippingFlatRate") as string)
    : null;
  const roundingMethod = (formData.get("roundingMethod") as string) || "psychological";
  const countries = formData.get("countries") as string || null;
  const status = (formData.get("status") as string) || "draft";

  const rule = await db.pricingRule.create({
    data: {
      shopId: shop.id,
      name: name.trim(),
      scope,
      adjustmentType,
      adjustmentValue,
      includeDuty,
      includeVat,
      dutyRate,
      vatRate,
      shippingCostType,
      shippingFlatRate,
      roundingMethod,
      countries,
      status,
    },
  });

  return { success: true, ruleId: rule.id };
};

export default function NewPricingRulePage() {
  const { roundingMethod } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const [scope, setScope] = useState("all");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState("percentage");
  const [includeDuty, setIncludeDuty] = useState(true);
  const [includeVat, setIncludeVat] = useState(true);
  const [shippingType, setShippingType] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Pricing rule created!");
      navigate("/app/pricing-rules");
    }
  }, [fetcher.data, shopify, navigate]);

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <s-page heading="Create Pricing Rule">
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
                placeholder="e.g., EU DDP Pricing"
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
            <div className={styles["form-field__hint"]} style={{ marginBottom: "0.75rem" }}>
              Select which countries this rule applies to. Leave empty to apply to all countries.
            </div>
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
                <label className={styles["form-field__label"]}>
                  {adjustmentType === "percentage"
                    ? "Adjustment (%)"
                    : adjustmentType === "multiplier"
                    ? "Multiplier"
                    : "Fixed Amount ($)"}
                </label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="adjustmentValue"
                  step={adjustmentType === "multiplier" ? "0.01" : "1"}
                  defaultValue={adjustmentType === "multiplier" ? "1.0" : "0"}
                />
                <div className={styles["form-field__hint"]}>
                  {adjustmentType === "percentage"
                    ? "Positive = markup, negative = discount"
                    : adjustmentType === "multiplier"
                    ? "1.0 = no change, 1.15 = 15% markup"
                    : "Fixed amount to add or subtract from base price"}
                </div>
              </div>
            </div>
          </div>

          {/* Duties & Taxes */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Duties & Taxes</div>

            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>Include Duty</div>
                <div className={styles["toggle-row__hint"]}>
                  Add estimated duty to the displayed price
                </div>
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
                <div className={styles["toggle-row__hint"]}>
                  Add local VAT/GST rate to the displayed price
                </div>
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
                <label className={styles["form-field__label"]}>
                  Override Duty Rate (%)
                </label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="dutyRate"
                  step="0.1"
                  placeholder="Auto from country config"
                />
                <div className={styles["form-field__hint"]}>
                  Leave empty to use per-country defaults
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>
                  Override VAT Rate (%)
                </label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="vatRate"
                  step="0.1"
                  placeholder="Auto from country config"
                />
                <div className={styles["form-field__hint"]}>
                  Leave empty to use per-country defaults
                </div>
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
                  <option value="">None (exclude shipping)</option>
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
                    defaultValue="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rounding */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Price Rounding</div>
            <div className={styles["form-field"]}>
              <label className={styles["form-field__label"]}>Rounding Method</label>
              <select
                className={styles["form-field__select"]}
                name="roundingMethod"
                defaultValue={roundingMethod}
              >
                {Object.entries(ROUNDING_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <div className={styles["form-field__hint"]}>
                Psychological rounding (e.g., $49.99) can improve conversion rates by 15-24%
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Status</div>
            <div className={styles["form-field"]}>
              <select className={styles["form-field__select"]} name="status" defaultValue="draft">
                <option value="draft">Draft — not active yet</option>
                <option value="active">Active — applying to prices</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
            <s-button variant="primary" type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Create Rule
            </s-button>
            <s-button variant="tertiary" href="/app/pricing-rules">
              Cancel
            </s-button>
          </div>
        </fetcher.Form>
      </s-section>

      {/* DDP Preview */}
      <s-section slot="aside" heading="DDP Price Preview">
        <div className={styles["ddp-preview"]}>
          <div className={styles["ddp-preview__row"]}>
            <span>Base Price</span>
            <span>$100.00</span>
          </div>
          <div className={styles["ddp-preview__row"]}>
            <span>Price Adjustment</span>
            <span>$0.00</span>
          </div>
          <div className={styles["ddp-preview__row"]}>
            <span>Estimated Duty</span>
            <span>$5.00</span>
          </div>
          <div className={styles["ddp-preview__row"]}>
            <span>VAT / GST</span>
            <span>$20.00</span>
          </div>
          <div className={styles["ddp-preview__row"]}>
            <span>Shipping</span>
            <span>$12.00</span>
          </div>
          <div className={`${styles["ddp-preview__row"]} ${styles["ddp-preview__row--total"]}`}>
            <span>Landed Price</span>
            <span>$136.99</span>
          </div>
          <div className={styles["ddp-preview__savings"]}>
            ✅ No surprise fees at checkout
          </div>
        </div>
        <s-paragraph>
          <s-text>
            This preview shows how a $100 product would be priced for a customer in the UK with duties, 20% VAT, and shipping included.
          </s-text>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="What is DDP?">
        <s-paragraph>
          <s-text>
            Delivered Duty Paid (DDP) means your customer sees the full landed price upfront — no surprise customs fees. This can increase international conversion rates by up to 30%.
          </s-text>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
