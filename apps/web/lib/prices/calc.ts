/** How much an amount of money buys at a price. Null when the price is not usable. */
export function quantityFor(amount: number, price: number | null): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  return amount / price;
}

/** Percent change from then to now, to one decimal place. Null when it cannot be worked out. */
export function percentChange(then: number | null, now: number | null): number | null {
  if (then === null || now === null || !Number.isFinite(then) || !Number.isFinite(now) || then === 0) return null;
  return Math.round(((now - then) / then) * 1000) / 10;
}

/** A change smaller than half a percent is reported as "about the same". */
export function direction(pct: number): "more" | "less" | "same" {
  if (Math.abs(pct) < 0.5) return "same";
  return pct > 0 ? "more" : "less";
}

export interface PricePair { then: number | null; now: number | null }
export interface BasketResult { then: number; now: number; percent: number | null; missing: string[] }

/** A household basket: quantity times price, for both months. Items with no official figure are left out and listed. */
export function basketCost(picks: { id: string; qty: number }[], prices: Record<string, PricePair>): BasketResult {
  let then = 0, now = 0;
  const missing: string[] = [];
  for (const p of picks) {
    if (!Number.isFinite(p.qty) || p.qty <= 0) continue;
    const price = prices[p.id];
    if (!price || price.then === null || price.now === null) { missing.push(p.id); continue; }
    then += p.qty * price.then;
    now += p.qty * price.now;
  }
  return { then, now, percent: then > 0 ? percentChange(then, now) : null, missing };
}

/** Whole calendar months between a "YYYY-MM" period and today. */
export function monthsOld(period: string, today: Date): number {
  const [y, m] = period.split("-").map(Number);
  return (today.getUTCFullYear() - y!) * 12 + (today.getUTCMonth() + 1 - m!);
}
