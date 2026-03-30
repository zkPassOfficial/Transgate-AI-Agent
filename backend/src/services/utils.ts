/**
 * Extract JSON from LLM output with 3-layer fallback:
 * 1. Direct parse
 * 2. Code fence extraction
 * 3. First {...} block
 */
export function extractJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {}
  }

  throw new Error(`Failed to extract JSON from LLM output: ${text.slice(0, 200)}`);
}

/**
 * Per-key Promise-chain lock.
 * Serializes concurrent calls for the same key.
 */
const locks = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) || Promise.resolve();
  const current = prev.then(fn, fn);
  locks.set(key, current);
  current.finally(() => {
    if (locks.get(key) === current) locks.delete(key);
  });
  return current;
}
