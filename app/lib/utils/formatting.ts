// ─── GlobalForge: Formatting Utilities ───

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a compact string (e.g., 1.2K, 3.4M).
 */
export function formatCompact(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a percentage value with optional sign indicator.
 */
export function formatPercentage(
  value: number,
  showSign = true,
  decimals = 1,
): string {
  const formatted = value.toFixed(decimals);
  if (showSign && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | string,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

/**
 * Calculate conversion rate from impressions and conversions.
 */
export function calcConversionRate(
  impressions: number,
  conversions: number,
): number {
  if (impressions === 0) return 0;
  return (conversions / impressions) * 100;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Parse a JSON string safely, returning a fallback on failure.
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Apply psychological rounding to a price.
 * e.g., 43.27 → 42.99, 156.80 → 154.99
 */
export function psychologicalRound(price: number): number {
  if (price <= 0) return 0;
  if (price < 10) return Math.floor(price) - 0.01;
  if (price < 100) return Math.floor(price) - 0.01;
  return Math.floor(price / 5) * 5 - 0.01;
}

/**
 * Round a price based on the specified method.
 */
export function roundPrice(
  price: number,
  method: "none" | "nearest" | "psychological",
): number {
  switch (method) {
    case "nearest":
      return Math.round(price * 100) / 100;
    case "psychological":
      return psychologicalRound(price);
    case "none":
    default:
      return Math.round(price * 100) / 100;
  }
}

/**
 * Format a country code to its flag emoji.
 */
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const codePoints = [...code.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65,
  );
  return String.fromCodePoint(...codePoints);
}
