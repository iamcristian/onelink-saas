/**
 * Resolves the backend API base URL dynamically.
 * - When NEXT_PUBLIC_API_URL is configured, uses it.
 * - In browser on physical mobile devices (LAN IP), uses the server's IP with port 3001.
 * - Default fallback to http://localhost:3001.
 */
export function getApiBaseUrl(): string {
  // In the browser, always return "" (relative URL) so all requests hit the Next.js reverse proxy (/api/...) on the same domain (Vercel).
  // This eliminates CORS errors, firewall blocks, mixed content, and URL mismatch traps.
  if (typeof window !== "undefined") {
    return "";
  }
  // In Node.js SSR runtime on the server, resolve backend service URL and sanitize slashes
  const raw =
    process.env.API_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001";

  return raw.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
}
