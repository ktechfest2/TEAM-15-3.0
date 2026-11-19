import type { ArithmeticCheck, ResultFields, VerificationResult } from "@voteguard/shared";

/** Every figure on the sheet as [label, value] pairs. */
function allFigures(f: ResultFields): [string, number | null][] {
  return [
    ["registered", f.registered],
    ["accredited", f.accredited],
    ...Object.entries(f.parties),
    ["valid", f.valid],
    ["rejected", f.rejected],
    ["cast", f.cast],
  ];
}

const pass = (rule: ArithmeticCheck["rule"], message: string): ArithmeticCheck => ({ rule, ok: true, message });
const fail = (rule: ArithmeticCheck["rule"], message: string): ArithmeticCheck => ({ rule, ok: false, message });

/** Pure arithmetic consistency checks. A failed check is a reason to look, not proof of a problem. */
export function validateArithmetic(f: ResultFields): VerificationResult {
  const figures = allFigures(f);
  const missing = figures.filter(([, v]) => v === null).map(([k]) => k);
  const negative = figures.filter(([, v]) => v !== null && v < 0).map(([k]) => k);
  const checks: ArithmeticCheck[] = [];

  checks.push(
    missing.length
      ? fail("no_missing", `Could not read: ${missing.join(", ")}.`)
      : pass("no_missing", "Every figure was read."),
  );
  checks.push(
    negative.length
      ? fail("no_negative", `Negative figures: ${negative.join(", ")}.`)
      : pass("no_negative", "No negative figures."),
  );

  const partyValues = Object.values(f.parties);
  const partiesKnown = partyValues.length > 0 && partyValues.every((v): v is number => v !== null);
  if (partiesKnown && f.valid !== null) {
    const sum = (partyValues as number[]).reduce((a, b) => a + b, 0);
    checks.push(
      sum === f.valid
        ? pass("parties_sum_to_valid", `Party votes add up to ${f.valid} valid votes.`)
        : fail("parties_sum_to_valid", `Party votes add up to ${sum}, but valid votes are ${f.valid}.`),
    );
  } else {
    checks.push(fail("parties_sum_to_valid", "Cannot check party votes against valid votes: a figure is missing."));
  }

  if (f.valid !== null && f.rejected !== null && f.cast !== null) {
    const total = f.valid + f.rejected;
    checks.push(
      total === f.cast
        ? pass("valid_plus_rejected_equals_cast", `Valid plus rejected is ${f.cast} votes cast.`)
        : fail("valid_plus_rejected_equals_cast", `Valid plus rejected is ${total}, but votes cast are ${f.cast}.`),
    );
  } else {
    checks.push(fail("valid_plus_rejected_equals_cast", "Cannot check votes cast: a figure is missing."));
  }

  if (f.cast !== null && f.accredited !== null) {
    checks.push(
      f.cast <= f.accredited
        ? pass("cast_not_above_accredited", `Votes cast (${f.cast}) are not above accredited voters (${f.accredited}).`)
        : fail("cast_not_above_accredited", `Votes cast (${f.cast}) are above accredited voters (${f.accredited}).`),
    );
  } else {
    checks.push(fail("cast_not_above_accredited", "Cannot compare cast with accredited: a figure is missing."));
  }

  if (f.accredited !== null && f.registered !== null) {
    checks.push(
      f.accredited <= f.registered
        ? pass("accredited_not_above_registered", `Accredited (${f.accredited}) is not above registered (${f.registered}).`)
        : fail("accredited_not_above_registered", `Accredited (${f.accredited}) is above registered (${f.registered}).`),
    );
  } else {
    checks.push(fail("accredited_not_above_registered", "Cannot compare accredited with registered: a figure is missing."));
  }

  return { ok: checks.every((c) => c.ok), checks };
}
