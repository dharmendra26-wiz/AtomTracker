const BASE = import.meta.env.VITE_API_URL || "https://atomtracker.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

/**
 * Core fetch wrapper with 1 automatic retry after 3 s on network failure
 * (handles Render free-tier cold-start ~30 s sleep gracefully).
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

  // First attempt
  try {
    return await attempt();
  } catch (err) {
    // On network errors (backend sleeping / CORS preflight timeout), retry once after 3 s
    const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
    if (isNetworkError) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        return await attempt();
      } catch (retryErr) {
        // Give a friendlier message on repeated network failure
        if (retryErr instanceof TypeError && retryErr.message.includes("fetch")) {
          throw new Error(
            "Cannot reach the server. The backend may be waking up — please wait 30 s and try again."
          );
        }
        throw retryErr;
      }
    }
    throw err;
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
