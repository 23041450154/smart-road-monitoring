export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL || "";
}

export const API_URL = "";

export async function fetcher<T>(path: string): Promise<T> {
  const base = getApiUrl();
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  return response.json() as Promise<T>;
}

export async function mutateApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  const base = getApiUrl();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? `Permintaan gagal (${response.status})`);
  }
  return (response.status === 204 ? undefined : response.json()) as Promise<T>;
}

