import { useId as useReactId } from 'react';

/**
 * A stable id for wiring ARIA relationships (aria-labelledby, aria-controls).
 * A consumer-supplied id always wins so it can be referenced from outside.
 */
export function useId(providedId?: string): string {
  const generatedId = useReactId();
  return providedId ?? `keyline-${generatedId}`;
}
