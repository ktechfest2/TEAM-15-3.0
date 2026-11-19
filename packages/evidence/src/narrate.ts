import type { Language, ResultFields, Status } from "@voteguard/shared";

const ones = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${ones[h]} hundred`);
  if (r) {
    const t = r < 20 ? ones[r]! : tens[Math.floor(r / 10)]! + (r % 10 ? `-${ones[r % 10]}` : "");
    parts.push(h ? `and ${t}` : t);
  }
  return parts.join(" ");
}

/** Whole numbers up to 999,999 in full words, e.g. 112 gives "one hundred and twelve". */
export function numberToWords(n: number): string {
  if (n === 0) return "zero";
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands ? `${below1000(thousands)} thousand` : "";
  if (!rest) return head;
  if (!thousands) return below1000(rest);
  const tail = below1000(rest);
  return `${head}, ${rest < 100 ? "and " : ""}${tail}`;
}

export interface NarrationInput {
  fields: ResultFields;
  status: Status;
  /** Names of fields that differ between submissions (used when disputed). */
  differingFields: string[];
}

// NOTE: Pidgin strings need a native-speaker check before the demo.
const STATUS: Record<Language, Record<Status, (d: string) => string>> = {
  en: {
    two_people_agree: () => "Two people agree. The numbers add up.",
    disputed: (d) => `Two photos show different numbers for ${d || "one figure"}. A person will look at it.`,
    needs_human_review: () => "A person needs to check this sheet.",
    waiting_for_review: () => "This sheet is waiting for a second photo or a check.",
    reviewed: () => "A reviewer has looked at this sheet.",
  },
  pcm: {
    two_people_agree: () => "Two people see the same numbers. Di numbers add up.",
    disputed: (d) => `Two photos no show di same number for ${d || "one figure"}. Person go look am.`,
    needs_human_review: () => "Person must check dis sheet.",
    waiting_for_review: () => "We dey wait for another photo or for person to check am.",
    reviewed: () => "Reviewer don look dis sheet.",
  },
};

/**
 * Plain-language text for the Listen feature. Built only from verified fields and the status;
 * never claims more than the evidence supports.
 */
export function narrate(input: NarrationInput, lang: Language): string {
  const figures = Object.entries(input.fields.parties)
    .filter((e): e is [string, number] => e[1] !== null)
    .map(([party, v]) => `${party}, ${numberToWords(v)}.`);
  const status = STATUS[lang][input.status](input.differingFields.join(" and "));
  return [...figures, status].join(" ");
}
