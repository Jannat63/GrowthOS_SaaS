/**
 * The details of the legal pages that only the business can supply.
 *
 * These were nine bracketed strings scattered through the prose of three pages — `[privacy email]`,
 * `[Jurisdiction]`, `[Company Legal Name]` — which is the shape a placeholder takes right before it
 * ships. Gathered here, filling them in is one file and one pass, and `<Blank>` below makes any
 * that are still empty impossible to read past.
 *
 * Nothing here is guessable. A registered entity name or a governing jurisdiction invented by
 * software would be worse than a visible gap, because a gap is obviously unfinished and a
 * plausible wrong answer is not.
 */
export const LEGAL = {
  /** Registered company name, as it appears on the incorporation record. */
  entity: null as string | null,
  /** Governing law for the Terms — e.g. "England and Wales", "the State of Delaware". */
  jurisdiction: null as string | null,
  /** Where data-rights requests and privacy questions go. */
  privacyEmail: null as string | null,
  /** Where questions about the Terms go. May be the same address. */
  supportEmail: null as string | null,
  /** Set on the day counsel signs these off, not the day they were drafted. */
  lastUpdated: null as string | null,
};

/**
 * An unfilled detail, rendered so it cannot ship quietly.
 *
 * Gold, because `--warning` is this system's colour for "not the normal state" — the same meaning
 * the console's own bar carries. It is not `--destructive`: nothing is broken, the page is just
 * not finished.
 */
export function Blank({ children }: { children: string }) {
  return (
    <span className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-xs text-warning">
      {children}
    </span>
  );
}

/** A filled value, or a visible gap in its place. */
export function Detail({ value, label }: { value: string | null; label: string }) {
  return value ? <>{value}</> : <Blank>{label}</Blank>;
}
