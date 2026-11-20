import type { Item } from "../lib/candidates/extras";
import type { GuideLang } from "../lib/guide/langs";
import { t, type UiKey } from "../lib/guide/ui";

export function fmtDate(iso: string, lang: GuideLang): string {
  const d = new Date(`${iso}T00:00:00Z`);
  try { return d.toLocaleDateString(lang === "en" || lang === "pcm" ? "en-GB" : lang, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }); } catch { return iso; }
}

/** Who published it, whether it is opinion, and where and when. The same for every item on every candidate. */
export function ItemMeta({ item, lang }: { item: Item; lang: GuideLang }) {
  const chips = [item.occasion, item.place, item.language, item.length].filter(Boolean) as string[];
  return (
    <div className="meta">
      <span className={`chip ${item.publisherType === "candidate" ? "dark" : ""}`}>{t(lang, `cd.by.${item.publisherType}` as UiKey)}{item.publisherType === "outlet" || item.publisherType === "official" || item.publisherType === "academic" ? ` · ${item.publisher}` : ""}</span>
      {item.opinion && <span className="chip">{t(lang, "cd.opinion")}</span>}
      {chips.map((c) => <span className="chip" key={c}>{c}</span>)}
    </div>
  );
}
