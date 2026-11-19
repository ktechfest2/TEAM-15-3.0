import type { Language, Status } from "@voteguard/shared";
import { statusCopy } from "../lib/status-copy";

export function StatusPill({ status, lang }: { status: Status; lang: Language }) {
  const c = statusCopy(status, lang);
  return <span className={`pill ${status}`}><span aria-hidden="true">{c.icon}</span> {c.label}</span>;
}

export function StatusLine({ status, lang }: { status: Status; lang: Language }) {
  const c = statusCopy(status, lang);
  return <p className="status-line"><StatusPill status={status} lang={lang} /> <span>{c.sentence}</span></p>;
}
