import type { Language, Status } from "@voteguard/shared";

export const STATUSES: Status[] = ["waiting_for_review", "needs_human_review", "two_people_agree", "disputed", "reviewed"];

export interface StatusCopy {
  label: string;
  icon: string;
  /** One short, plain sentence (A3 easy-read). */
  sentence: string;
}

// NOTE: Pidgin strings need a native-speaker check before the demo.
const COPY: Record<Language, Record<Status, StatusCopy>> = {
  en: {
    waiting_for_review: { label: "Waiting", icon: "⏳", sentence: "We are waiting for a second photo or a check." },
    needs_human_review: { label: "Needs a person to check", icon: "👀", sentence: "A person needs to check this sheet." },
    two_people_agree: { label: "Two people agree", icon: "✅", sentence: "Two people sent the same numbers." },
    disputed: { label: "Photos differ", icon: "⚠️", sentence: "Two photos show different numbers. A person will look." },
    reviewed: { label: "Checked by a reviewer", icon: "🔎", sentence: "A reviewer has looked at this sheet." },
  },
  pcm: {
    waiting_for_review: { label: "We dey wait", icon: "⏳", sentence: "We dey wait for another photo or for person to check am." },
    needs_human_review: { label: "Person must check", icon: "👀", sentence: "Person must check dis sheet." },
    two_people_agree: { label: "Two people agree", icon: "✅", sentence: "Two people send di same numbers." },
    disputed: { label: "Photos no match", icon: "⚠️", sentence: "Two photos no show di same numbers. Person go look." },
    reviewed: { label: "Reviewer don check", icon: "🔎", sentence: "Reviewer don look dis sheet." },
  },
};

export function statusCopy(status: Status, lang: Language): StatusCopy {
  return COPY[lang][status];
}
