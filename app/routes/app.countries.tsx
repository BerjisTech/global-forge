import { useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { formatCurrency, countryFlag } from "../lib/utils/formatting";
import { POPULAR_COUNTRIES, DEFAULT_VAT_RATES, CURRENCIES } from "../lib/utils/constants";
import dashStyles from "../styles/dashboard.module.css";
import rulesStyles from "../styles/rules.module.css";
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

  const configs = await db.countryConfig.findMany({
    where: { shopId: shop.id },
    orderBy: { countryName: "asc" },
  });

  return { configs, shopId: shop.id };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  if (intent === "add-country") {
    const countryCode = formData.get("countryCode") as string;
    const country = POPULAR_COUNTRIES.find((c) => c.code === countryCode);
    if (!country) return { error: "Invalid country" };

    // Check if already exists
    const existing = await db.countryConfig.findUnique({
      where: { shopId_countryCode: { shopId: shop.id, countryCode } },
    });

    if (existing) return { error: "Country already configured" };

    await db.countryConfig.create({
      data: {
        shopId: shop.id,
        countryCode: country.code,
        countryName: country.name,
        currency: country.currency,
        vatRate: DEFAULT_VAT_RATES[country.code] || 0,
        enabled: true,
      },
    });

    return { success: true };
  }

  if (intent === "update-country") {
    const configId = formData.get("configId") as string;
    const vatRate = parseFloat(formData.get("vatRate") as string) || 0;
    const dutyRate = parseFloat(formData.get("dutyRate") as string) || 0;
    const deMinimis = parseFloat(formData.get("deMinimis") as string) || 0;
    const exchangeRate = parseFloat(formData.get("exchangeRate") as string) || 1;
    const baseShippingCost = parseFloat(formData.get("baseShippingCost") as string) || 0;
    const enabled = formData.get("enabled") === "true";

    await db.countryConfig.update({
      where: { id: configId },
      data: { vatRate, dutyRate, deMinimis, exchangeRate, baseShippingCost, enabled },
    });

    return { success: true };
  }

  if (intent === "delete-country") {
    const configId = formData.get("configId") as string;
    await db.countryConfig.delete({ where: { id: configId } });
    return { success: true };
  }

  if (intent === "add-popular") {
    // Add all popular countries at once
    const existingCodes = (
      await db.countryConfig.findMany({
        where: { shopId: shop.id },
        select: { countryCode: true },
      })
    ).map((c) => c.countryCode);

    const toAdd = POPULAR_COUNTRIES.filter((c) => !existingCodes.includes(c.code)).slice(0, 10);

    for (const country of toAdd) {
      await db.countryConfig.create({
        data: {
          shopId: shop.id,
          countryCode: country.code,
          countryName: country.name,
          currency: country.currency,
          vatRate: DEFAULT_VAT_RATES[country.code] || 0,
          enabled: true,
        },
      });
    }

    return { success: true };
  }

  return { error: "Unknown action" };
};

export default function CountriesPage() {
  const { configs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Countries updated!");
    }
  }, [fetcher.data, shopify]);

  // Countries not yet configured
  const configuredCodes = configs.map((c: { countryCode: string }) => c.countryCode);
  const availableCountries = POPULAR_COUNTRIES.filter(
    (c) => !configuredCodes.includes(c.code),
  );

  return (
    <s-page heading="Countries">
      <s-section>
        {configs.length > 0 ? (
          <div className={rulesStyles["countries-grid"]}>
            {configs.map((config: {
              id: string;
              countryCode: string;
              countryName: string;
              currency: string;
              exchangeRate: number;
              vatRate: number;
              dutyRate: number;
              deMinimis: number;
              baseShippingCost: number;
              enabled: boolean;
            }) => (
              <div
                key={config.id}
                className={`${rulesStyles["country-config-card"]} ${
                  !config.enabled ? rulesStyles["country-config-card--disabled"] : ""
                }`}
              >
                <div className={rulesStyles["country-config-card__header"]}>
                  <div className={rulesStyles["country-config-card__name"]}>
                    <span className={rulesStyles["country-config-card__flag"]}>
                      {countryFlag(config.countryCode)}
                    </span>
                    {config.countryName}
                  </div>
                  <span
                    className={`${dashStyles["status-badge"]} ${
                      dashStyles[`status-badge--${config.enabled ? "active" : "paused"}`]
                    }`}
                  >
                    {config.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className={rulesStyles["country-config-card__details"]}>
                  <div className={rulesStyles["country-config-card__detail"]}>
                    <div className={rulesStyles["country-config-card__detail-label"]}>
                      Currency
                    </div>
                    <div className={rulesStyles["country-config-card__detail-value"]}>
                      {config.currency}
                    </div>
                  </div>
                  <div className={rulesStyles["country-config-card__detail"]}>
                    <div className={rulesStyles["country-config-card__detail-label"]}>
                      VAT Rate
                    </div>
                    <div className={rulesStyles["country-config-card__detail-value"]}>
                      {config.vatRate}%
                    </div>
                  </div>
                  <div className={rulesStyles["country-config-card__detail"]}>
                    <div className={rulesStyles["country-config-card__detail-label"]}>
                      Duty Rate
                    </div>
                    <div className={rulesStyles["country-config-card__detail-value"]}>
                      {config.dutyRate}%
                    </div>
                  </div>
                  <div className={rulesStyles["country-config-card__detail"]}>
                    <div className={rulesStyles["country-config-card__detail-label"]}>
                      Shipping
                    </div>
                    <div className={rulesStyles["country-config-card__detail-value"]}>
                      {formatCurrency(config.baseShippingCost)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <fetcher.Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="update-country" />
                    <input type="hidden" name="configId" value={config.id} />
                    <input type="hidden" name="vatRate" value={String(config.vatRate)} />
                    <input type="hidden" name="dutyRate" value={String(config.dutyRate)} />
                    <input type="hidden" name="deMinimis" value={String(config.deMinimis)} />
                    <input type="hidden" name="exchangeRate" value={String(config.exchangeRate)} />
                    <input type="hidden" name="baseShippingCost" value={String(config.baseShippingCost)} />
                    <input type="hidden" name="enabled" value={String(!config.enabled)} />
                    <s-button variant="tertiary" type="submit" size="small">
                      {config.enabled ? "Disable" : "Enable"}
                    </s-button>
                  </fetcher.Form>
                  <fetcher.Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="delete-country" />
                    <input type="hidden" name="configId" value={config.id} />
                    <s-button variant="tertiary" type="submit" size="small" tone="critical">
                      Remove
                    </s-button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>🗺️</div>
            <div className={dashStyles["empty-state__title"]}>No countries configured</div>
            <div className={dashStyles["empty-state__description"]}>
              Add countries to set up duty rates, VAT, exchange rates, and shipping costs for international pricing.
            </div>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="add-popular" />
              <s-button type="submit" {...(isSubmitting ? { loading: true } : {})}>
                Add Popular Countries
              </s-button>
            </fetcher.Form>
          </div>
        )}
      </s-section>

      {/* Add Country */}
      <s-section slot="aside" heading="Add Country">
        {availableCountries.length > 0 ? (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {availableCountries.slice(0, 8).map((country) => (
              <fetcher.Form key={country.code} method="post">
                <input type="hidden" name="intent" value="add-country" />
                <input type="hidden" name="countryCode" value={country.code} />
                <s-button
                  variant="tertiary"
                  type="submit"
                  style={{ width: "100%" }}
                >
                  {countryFlag(country.code)} {country.name}
                </s-button>
              </fetcher.Form>
            ))}
            {availableCountries.length > 8 && (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="add-popular" />
                <s-button variant="primary" type="submit" {...(isSubmitting ? { loading: true } : {})}>
                  Add All Popular Countries
                </s-button>
              </fetcher.Form>
            )}
          </div>
        ) : (
          <s-paragraph>
            <s-text>All popular countries have been added.</s-text>
          </s-paragraph>
        )}
      </s-section>

      <s-section slot="aside" heading="About Countries">
        <s-paragraph>
          <s-text>
            Configure per-country duty rates, VAT/GST rates, and base shipping costs. These values are used by your pricing rules to calculate accurate DDP landed prices.
          </s-text>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
