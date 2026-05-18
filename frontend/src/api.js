const BASE = import.meta.env.VITE_API_URL || "https://atomtracker.onrender.com";

function getToken() {
  return localStorage.getItem("token");
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

/** Fire-and-forget no-cors ping to wake up the Render dyno.
 *  no-cors skips the preflight so it reaches the server even when sleeping. */
async function warmUp() {
  try {
    await fetch(`${BASE}/`, { method: "GET", mode: "no-cors" });
  } catch {
    // Ignore — this is just a warm-up
  }
}

/**
 * Core fetch wrapper with automatic retries for Render free-tier cold-starts.
 * Retries up to 3 times with 10 s gaps (≈ 30 s total) — matching Render wake-up time.
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
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return data;
  }

  // Attempt with up to 3 retries on network failure (cold-start)
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10_000; // 10 s — matches Render wake-up time

  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await attempt();
    } catch (err) {
      const isLast = i === MAX_RETRIES;

      if (isNetworkError(err) && !isLast) {
        // Fire a no-cors ping to wake the dyno, then wait before retrying
        warmUp();
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      // On last retry or non-network error, surface a clear message
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
