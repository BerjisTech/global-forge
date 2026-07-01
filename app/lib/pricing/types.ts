// ─── GlobalForge: TypeScript Types ───

export interface DashboardMetrics {
  totalRevenue: number;
  conversionRate: number;
  totalImpressions: number;
  activePricingRules: number;
  activeCountries: number;
  avgDutySaved: number;
  revenueByDay: Array<{ date: string; revenue: number; conversions: number }>;
  topRules: TopRuleMetric[];
  topCountries: TopCountryMetric[];
}

export interface TopRuleMetric {
  id: string;
  name: string;
  scope: string;
  impressions: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface TopCountryMetric {
  countryCode: string;
  countryName: string;
  impressions: number;
  conversions: number;
  revenue: number;
  dutySaved: number;
}

export interface PricingRuleFormData {
  name: string;
  scope: "all" | "products" | "collections" | "tags";
  targetProducts: string;
  targetCollections: string;
  targetTags: string;
  countries: string;
  excludeCountries: string;
  adjustmentType: "percentage" | "fixed" | "multiplier";
  adjustmentValue: number;
  includeDuty: boolean;
  includeVat: boolean;
  dutyRate: number | null;
  vatRate: number | null;
  shippingCostType: "flat" | "weight_based" | "api" | null;
  shippingFlatRate: number | null;
  roundingMethod: "none" | "nearest" | "psychological";
}

export interface CountryConfigFormData {
  countryCode: string;
  countryName: string;
  enabled: boolean;
  currency: string;
  exchangeRate: number;
  vatRate: number;
  dutyRate: number;
  deMinimis: number;
  shippingZone: string;
  baseShippingCost: number;
}

export interface ShopSettings {
  baseCurrency: string;
  brandColor: string;
  accentColor: string;
  roundingMethod: string;
  showLandedPrice: boolean;
  dutyApiKey: string | null;
  dutyApiProvider: string | null;
}

// ─── DDP Calculator Types ───

export interface DDPCalculation {
  basePrice: number;
  baseCurrency: string;
  targetCurrency: string;
  convertedPrice: number;
  dutyAmount: number;
  vatAmount: number;
  shippingCost: number;
  landedPrice: number;
  suggestedPrice: number;
  savings: number;
}

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  flag: string;
}
