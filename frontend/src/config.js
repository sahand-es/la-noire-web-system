/**
 * Runtime config. In Docker, config.js is generated at container startup from env vars.
 * Falls back to Vite build-time env (VITE_API_URL) for local dev.
 */
function getApiBase() {
  const fromRuntime =
    typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.apiUrl;
  const fromVite =
    import.meta.env.VITE_API_URL || import.meta.env.API_BASE_URL || "";
  return (fromRuntime || fromVite || "").replace(/\/$/, "");
}

export { getApiBase };
