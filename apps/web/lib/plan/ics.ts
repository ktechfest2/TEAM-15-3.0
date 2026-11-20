/** Saturday 16 January 2027: the date INEC gives for the presidential and National Assembly elections (inecnigeria.org/elections/calendar). */
export const VOTING_DATE = "2027-01-16";

export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines over 75 characters are folded with a CRLF and a space, as the calendar format requires. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}

function parseDate(d: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) throw new Error("date must be YYYY-MM-DD");
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (dt.getUTCFullYear() !== Number(m[1]) || dt.getUTCMonth() !== Number(m[2]) - 1 || dt.getUTCDate() !== Number(m[3])) throw new Error("not a real date");
  return dt;
}
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export interface IcsInput { unitCode: string; unitName: string; date: string; url: string }

/**
 * A one-day calendar event made on the phone, so no personal data goes anywhere.
 * It deliberately says nothing about hours, rules or what to bring: those come from the electoral body.
 */
export function buildIcs(i: IcsInput): string {
  const start = parseDate(i.date);
  const end = new Date(start.getTime() + 86_400_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VOTE-GUARD 360//Voter Desk//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:voting-day-${i.unitCode}-${ymd(start)}@voteguard-360`,
    `DTSTAMP:${ymd(start)}T000000Z`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${icsEscape(`Voting day: ${i.unitName}`)}`,
    `DESCRIPTION:${icsEscape(`Election date from INEC (inecnigeria.org/elections/calendar). For official rules and times, check INEC's own website. Unit page: ${i.url}`)}`,
    `URL:${i.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
