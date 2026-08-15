type ClassValue = string | number | null | false | undefined | ClassValue[]

/**
 * Minimal class joiner. Later Tailwind classes win via source order, so keep
 * component defaults first and consumer `className` last.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    if (Array.isArray(value)) {
      const nested = cn(...value)
      if (nested) out.push(nested)
    } else {
      out.push(String(value))
    }
  }
  return out.join(' ')
}
