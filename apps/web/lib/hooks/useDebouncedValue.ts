"use client";
import { useEffect, useState } from "react";

/**
 * Delays a fast-changing value so it can be used as a query key.
 *
 * The admin tables passed their raw search box straight into `useQuery`, so typing "acme" issued
 * four requests — each one a distinct query key, each one hitting the API and writing an
 * audit-log row. On a surface whose whole premise is that every read is recorded, that turns one
 * search into four entries in the compliance record.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return settled;
}
