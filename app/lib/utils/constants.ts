// ─── GlobalForge: Constants ───

/** Scope icons for pricing rules */
export const SCOPE_ICONS: Record<string, string> = {
  all: "🌍",
  products: "📦",
  collections: "🗂️",
  tags: "🏷️",
};

export const SCOPE_LABELS: Record<string, string> = {
  all: "All Products",
  products: "Specific Products",
  collections: "Collections",
  tags: "Product Tags",
};

/** Adjustment type labels */
export const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage",
  fixed: "Fixed Amount",
  multiplier: "Multiplier",
};

/** Rounding method labels */
export const ROUNDING_LABELS: Record<string, string> = {
  none: "No Rounding",
  nearest: "Nearest Cent",
  psychological: "Psychological (X.99)",
};

/** Popular countries for international selling */
export const POPULAR_COUNTRIES = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
];

/** All supported currencies */
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "NZD", symbol: "$", name: "New Zealand Dollar" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
];

/** Default VAT rates by country */
export const DEFAULT_VAT_RATES: Record<string, number> = {
  GB: 20,
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
  NL: 21,
  SE: 25,
  NO: 25,
  DK: 25,
  CH: 7.7,
  AU: 10,
  JP: 10,
  KR: 10,
  CN: 13,
  IN: 18,
  BR: 17,
  MX: 16,
  SG: 9,
  AE: 5,
  SA: 15,
  NZ: 15,
  KE: 16,
  ZA: 15,
  NG: 7.5,
  CA: 5,
  US: 0,
};
