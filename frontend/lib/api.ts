export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://api.lajusmart.app";
}

export const API_URL = "";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("smartroad_token");
  }
  return null;
}

export async function fetcher<T>(path: string): Promise<T> {
  const base = getApiUrl();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers,
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(12_000)
          : undefined,
      });
      if (response.ok) {
        return response.json() as Promise<T>;
      }
      if (response.status >= 502 && response.status <= 504 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new Error(`API ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gagal terhubung ke backend");
}

export async function mutateApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  const base = getApiUrl();
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? `Permintaan gagal (${response.status})`);
  }
  return (response.status === 204 ? undefined : response.json()) as Promise<T>;
}

