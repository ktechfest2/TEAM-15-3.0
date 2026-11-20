import type { Image } from "../lib/candidates/extras";

/** A candidate's photo if we hold one with its source and licence on record, otherwise the same neutral silhouette for everyone. */
export function Portrait({ name, photo, size = "sm" }: { name: string; photo: Image | null; size?: "sm" | "lg" }) {
  return (
    <span className={`portrait ${size}`}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo.url} alt={name} loading="lazy" referrerPolicy="no-referrer" />
        : <svg viewBox="0 0 40 48" aria-hidden="true" focusable="false"><circle cx="20" cy="16" r="8" /><path d="M4 48c0-11 7-18 16-18s16 7 16 18z" /></svg>}
    </span>
  );
}

/** The party's logo if we hold one with its source and licence on record, otherwise its INEC abbreviation in a plain box. */
export function PartyMark({ code, name, logo }: { code: string; name: string; logo: Image | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (logo) return <img className="party-logo" src={logo.url} alt={`${name} logo`} loading="lazy" referrerPolicy="no-referrer" />;
  return <span className="party-abbr" title={name}>{code}</span>;
}
