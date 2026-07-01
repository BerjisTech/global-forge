import { useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { CURRENCIES, ROUNDING_LABELS } from "../lib/utils/constants";
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

  return {
    settings: {
      baseCurrency: shop.baseCurrency,
      brandColor: shop.brandColor,
      accentColor: shop.accentColor,
      roundingMethod: shop.roundingMethod,
      showLandedPrice: shop.showLandedPrice,
      dutyApiKey: shop.dutyApiKey,
      dutyApiProvider: shop.dutyApiProvider,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  const baseCurrency = (formData.get("baseCurrency") as string) || "USD";
  const brandColor = (formData.get("brandColor") as string) || "#0891B2";
  const accentColor = (formData.get("accentColor") as string) || "#6366F1";
  const roundingMethod = (formData.get("roundingMethod") as string) || "psychological";
  const showLandedPrice = formData.get("showLandedPrice") === "on";
  const dutyApiProvider = (formData.get("dutyApiProvider") as string) || null;
  const dutyApiKey = (formData.get("dutyApiKey") as string) || null;

  await db.shop.update({
    where: { id: shop.id },
    data: {
      baseCurrency,
      brandColor,
      accentColor,
      roundingMethod,
      showLandedPrice,
      dutyApiProvider: dutyApiProvider || null,
      dutyApiKey: dutyApiKey || null,
    },
  });

  return { success: true };
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Settings saved!");
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="Settings">
      <s-section>
        <fetcher.Form method="post">
          {fetcher.data && "error" in fetcher.data && (
            <s-banner tone="critical">
              {fetcher.data.error}
            </s-banner>
          )}

          {/* General Settings */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>General</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Base Currency</label>
                <select
                  className={styles["form-field__select"]}
                  name="baseCurrency"
                  defaultValue={settings.baseCurrency}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
                <div className={styles["form-field__hint"]}>
                  Your store's primary currency for price calculations
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Default Rounding</label>
                <select
                  className={styles["form-field__select"]}
                  name="roundingMethod"
                  defaultValue={settings.roundingMethod}
                >
                  {Object.entries(ROUNDING_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className={styles["form-field__hint"]}>
                  Applied to adjusted international prices
                </div>
              </div>
            </div>
            <div className={styles["toggle-row"]} style={{ marginTop: "1rem" }}>
              <div>
                <div className={styles["toggle-row__label"]}>Show Landed Price</div>
                <div className={styles["toggle-row__hint"]}>
                  Display the full landed price (including duties, taxes, shipping) to customers
                </div>
              </div>
              <input
                type="checkbox"
                name="showLandedPrice"
                defaultChecked={settings.showLandedPrice}
              />
            </div>
          </div>

          {/* Branding */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Branding</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Primary Color</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="color"
                    name="brandColor"
                    defaultValue={settings.brandColor}
                    style={{ width: "40px", height: "36px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                  />
                  <input
                    className={styles["form-field__input"]}
                    type="text"
                    defaultValue={settings.brandColor}
                    style={{ flex: 1 }}
                    readOnly
                  />
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Accent Color</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={settings.accentColor}
                    style={{ width: "40px", height: "36px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                  />
                  <input
                    className={styles["form-field__input"]}
                    type="text"
                    defaultValue={settings.accentColor}
                    style={{ flex: 1 }}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Duty/Tax API */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Duty & Tax API</div>
            <div className={styles["form-field"]}>
              <label className={styles["form-field__label"]}>Provider</label>
              <select
                className={styles["form-field__select"]}
                name="dutyApiProvider"
                defaultValue={settings.dutyApiProvider || ""}
              >
                <option value="">Manual (use country configs)</option>
                <option value="zonos">Zonos</option>
                <option value="avalara">Avalara</option>
              </select>
              <div className={styles["form-field__hint"]}>
                Choose an external API for automatic duty and tax calculations, or use manual rates from your country configurations
              </div>
            </div>
            <div className={styles["form-field"]}>
              <label className={styles["form-field__label"]}>API Key</label>
              <input
                className={styles["form-field__input"]}
                type="password"
                name="dutyApiKey"
                defaultValue={settings.dutyApiKey || ""}
                placeholder="Enter your API key"
              />
              <div className={styles["form-field__hint"]}>
                Required if using Zonos or Avalara. Get your key from the provider's dashboard.
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <s-button variant="primary" type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Save Settings
            </s-button>
          </div>
        </fetcher.Form>
      </s-section>

      {/* App Info */}
      <s-section slot="aside" heading="About GlobalForge">
        <s-unordered-list>
          <s-list-item>
            <s-text>Version: 1.0.0</s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Framework: React Router</s-text>
          </s-list-item>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">
              Shopify Admin API
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="API Key Setup">
        <s-paragraph>
          <s-text>
            For automatic duty and tax calculations, you'll need an API key from one of our supported providers:
          </s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <s-link href="https://zonos.com" target="_blank">
              Zonos — Landed cost & duty calculation
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="https://avalara.com" target="_blank">
              Avalara — Tax compliance & calculation
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Support">
        <s-paragraph>
          <s-text>
            Need help? Reach out to our support team for assistance with international pricing, duty calculations, or any technical issues.
          </s-text>
        </s-paragraph>
        <s-button href="mailto:support@berjis.tech" variant="tertiary">
          Contact Support
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
