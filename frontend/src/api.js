// In production (Vercel), API calls go to /api/* which Vercel proxies to the
// Render backend server-side — eliminating CORS entirely (same-origin request).
// In local dev, VITE_API_URL points directly to localhost:8000.
const IS_DEV = Boolean(import.meta.env.VITE_API_URL);
const BASE = IS_DEV
  ? import.meta.env.VITE_API_URL
  : "/api";

function getToken() {
  return sessionStorage.getItem("token");
}

/** Returns true for any network-level failure (server asleep, CORS preflight timeout, etc.) */
function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    (err instanceof Error && (
      err.message.includes("fetch") ||
      err.message.includes("network") ||
      err.message.includes("Network") ||
      err.message.includes("Failed to fetch") ||
      err.message.includes("Load failed")
    ))
  );
}

/** Fire-and-forget no-cors ping to wake up the Render dyno. */
async function warmUp() {
  try {
    // In production, /api/ proxies to the Render backend via Vercel
    await fetch(`${BASE}/`, { method: "GET" });
  } catch {
    // Ignore — this is just a warm-up
  }
}

/**
 * Core fetch wrapper with automatic retries for Render free-tier cold-starts.
 * In production: requests go through Vercel proxy (no CORS preflight).
 * Retries up to 3 times with 10 s gaps (~30 s total).
 */
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  async function attempt() {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    if (!res.ok) {
      const msg = data?.detail || `Request failed (${res.status})`;
      const msgStr = typeof msg === "string" ? msg : JSON.stringify(msg);
      // Stale token: user ID no longer exists in DB (DB was wiped & re-seeded)
      // Force a logout so the user is sent back to /login to re-authenticate
      if (res.status === 401 || msgStr.toLowerCase().includes("not found") || msgStr.toLowerCase().includes("not authenticated")) {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
      throw new Error(msgStr);
    }
    return data;
  }

  // Attempt with up to 3 retries on network failure (cold-start)
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10_000; // 10 s between retries

  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await attempt();
    } catch (err) {
      const isLast = i === MAX_RETRIES;

      if (isNetworkError(err) && !isLast) {
        warmUp();
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      if (isNetworkError(err)) {
        throw new Error(
          "Cannot reach the server. The backend may be waking up — please wait 30 s and try again."
        );
      }

      throw err;
    }
  }
}

export async function downloadBlob(path, filename) {
  const t = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
