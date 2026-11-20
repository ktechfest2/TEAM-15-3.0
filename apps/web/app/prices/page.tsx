"use client";

import { useEffect, useMemo, useState } from "react";
import { Listen } from "../../components/listen";
import raw from "../../lib/data/prices.json";
import { basketCost, direction, monthsOld, quantityFor } from "../../lib/prices/calc";
import { basketSentence, buysSentence, formatNaira, formatQuantity, itemName } from "../../lib/prices/copy";
import { loadPrices } from "../../lib/prices/data";
import { t } from "../../lib/guide/ui";
import { useApp } from "../providers";

const DATA = loadPrices(raw);
const DEFAULT_QTY: Record<string, number> = { beans: 4, tomato: 4, petrol: 20, rice: 10, garri: 4 };
const BASKET_KEY = "voteguard.basket";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const periodName = (p: string) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;

interface Pick { on: boolean; qty: number }

export default function PricesPage() {
  const { prefs } = useApp();
  const l = prefs.lang;
  const [tab, setTab] = useState<"buys" | "basket">("buys");
  const [picks, setPicks] = useState<Record<string, Pick>>(() => Object.fromEntries(DATA.items.map((i) => [i.id, { on: false, qty: DEFAULT_QTY[i.id] ?? 1 }])));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BASKET_KEY) ?? "null") as Record<string, Pick> | null;
      if (saved) setPicks((old) => ({ ...old, ...Object.fromEntries(Object.entries(saved).filter(([id, v]) => id in old && typeof v?.on === "boolean" && typeof v?.qty === "number")) }));
    } catch { /* blocked storage: keep defaults */ }
  }, []);
  const setPick = (id: string, p: Partial<Pick>) => setPicks((old) => {
    const next = { ...old, [id]: { ...old[id]!, ...p } };
    try { localStorage.setItem(BASKET_KEY, JSON.stringify(next)); } catch { /* memory only */ }
    return next;
  });

  const priced = DATA.items.filter((i) => i.now && i.then);
  const latest = priced.reduce((m, i) => (i.now!.period > m ? i.now!.period : m), "");
  const stale = latest && monthsOld(latest, new Date()) >= 2;
  const prices = useMemo(() => Object.fromEntries(DATA.items.map((i) => [i.id, { then: i.then?.naira ?? null, now: i.now?.naira ?? null }])), []);
  const basket = useMemo(() => basketCost(DATA.items.filter((i) => picks[i.id]?.on).map((i) => ({ id: i.id, qty: picks[i.id]!.qty })), prices), [picks, prices]);
  const unchecked = DATA.items.some((i) => i.now && !i.source.checkedAgainstOriginal);
  const maxQty = (id: string) => Math.max(...[quantityFor(1000, prices[id]!.then), quantityFor(1000, prices[id]!.now)].filter((x): x is number => x !== null));

  return (
    <>
      <div className="kicker">{t(l, "home.lead.kicker")}</div>
      <h1>{t(l, "prices.title")}</h1>
      {stale && <p className="notice" role="status">{t(l, "prices.stale").replace("{period}", periodName(latest))}</p>}
      {unchecked && <p className="notice muted">{t(l, "prices.unchecked")}</p>}

      <div className="seg" role="tablist" aria-label={t(l, "prices.title")}>
        <button role="tab" aria-selected={tab === "buys"} onClick={() => setTab("buys")}>{t(l, "prices.tab.buys")}</button>
        <button role="tab" aria-selected={tab === "basket"} onClick={() => setTab("basket")}>{t(l, "prices.tab.basket")}</button>
      </div>

      {tab === "buys" && DATA.items.map((i) => {
        if (!i.now || !i.then) {
          return (
            <section className="card" key={i.id}>
              <h2 className="serif">{cap(itemName(i.id, l))}</h2>
              <p className="muted">{t(l, "prices.nofigure")}</p>
              {i.missingReason && <p className="muted small-print">{i.missingReason}</p>}
            </section>
          );
        }
        const qThen = quantityFor(1000, i.then.naira)!, qNow = quantityFor(1000, i.now.naira)!, mx = maxQty(i.id);
        const text = buysSentence(l, i.id, formatQuantity(i.unit, qThen), formatQuantity(i.unit, qNow));
        return (
          <section className="card" key={i.id}>
            <h2 className="serif">{cap(itemName(i.id, l))}</h2>
            <p>{text}</p>
            <div className="bars" aria-hidden="true">
              <div><span className="lbl">{t(l, "prices.then")} · {periodName(i.then.period)}</span><div className="b then" style={{ width: `${(qThen / mx) * 100}%` }} /><b>{formatQuantity(i.unit, qThen)}</b></div>
              <div><span className="lbl">{t(l, "prices.now")} · {periodName(i.now.period)}</span><div className="b" style={{ width: `${(qNow / mx) * 100}%` }} /><b>{formatQuantity(i.unit, qNow)}</b></div>
            </div>
            <Listen text={text} lang={l} slow={prefs.slowVoice} label="Listen" />
            <p className="source">{t(l, "prices.source")}: {i.source.name}. {formatNaira(i.then.naira)} → {formatNaira(i.now.naira)} per {i.unit}. <a href={i.source.url} target="_blank" rel="noreferrer">{t(l, "prices.original")} ↗</a></p>
          </section>
        );
      })}

      {tab === "basket" && (
        <>
          <section className="card">
            {DATA.items.map((i) => {
              const p = picks[i.id]!;
              const none = !i.now || !i.then;
              return (
                <div className="basket-row" key={i.id}>
                  <label className="check"><input type="checkbox" checked={p.on} onChange={(e) => setPick(i.id, { on: e.target.checked })} /> {itemName(i.id, l)}</label>
                  {p.on && (
                    <label className="qty">
                      <span className="muted">{t(l, "prices.qty")} ({i.unit === "kg" ? "kg" : "litres"})</span>
                      <input type="number" min={0} step="any" inputMode="decimal" value={p.qty} onChange={(e) => setPick(i.id, { qty: Number(e.target.value) })} />
                    </label>
                  )}
                  {none && p.on && <p className="muted small-print">{t(l, "prices.nofigure")}</p>}
                </div>
              );
            })}
          </section>
          <section className="card basket-result" aria-live="polite">
            <div className="kicker">{t(l, "prices.cost")}</div>
            {basket.then > 0 ? (
              <>
                <p className="big">{formatNaira(Math.round(basket.then))} → {formatNaira(Math.round(basket.now))}</p>
                {basket.percent !== null && <p>{basketSentence(l, direction(basket.percent), basket.percent)}</p>}
                <p className="muted">{t(l, "prices.note")}</p>
              </>
            ) : <p className="muted">—</p>}
            {basket.missing.length > 0 && <p className="muted small-print">{t(l, "prices.missing")} {basket.missing.map((id) => itemName(id, l)).join(", ")}</p>}
          </section>
        </>
      )}

      <details className="card">
        <summary>{t(l, "prices.how.title")}</summary>
        <p>{t(l, "prices.how.body")}</p>
      </details>
    </>
  );
}
