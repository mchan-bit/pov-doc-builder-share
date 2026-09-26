declare global {
  interface Window {
    CRIBL_API_URL?: string;
  }
}

function getApiBase(): string | null {
  return typeof window !== 'undefined' && window.CRIBL_API_URL
    ? window.CRIBL_API_URL
    : null;
}

/** Cribl KV entries may be returned raw or wrapped as `{ value: ... }`. */
function unwrapKvValue<T>(body: unknown): T | null {
  if (body == null) return null;
  if (typeof body === 'object' && 'value' in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>).value as T;
  }
  return body as T;
}

function kvUrl(key: string): string {
  return `${getApiBase()}/kvstore/${key}`;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const base = getApiBase();
  if (!base) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return unwrapKvValue<T>(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  const res = await fetch(kvUrl(key), {
    headers: { accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`KV get failed (${res.status})`);
  }
  const body: unknown = await res.json();
  return unwrapKvValue<T>(body);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const base = getApiBase();
  const payload = JSON.stringify(value);

  if (!base) {
    localStorage.setItem(key, payload);
    return;
  }

  const res = await fetch(kvUrl(key), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`KV set failed (${res.status})`);
  }
}
