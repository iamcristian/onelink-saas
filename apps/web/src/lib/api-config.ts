/**
 * Resolves the backend API base URL dynamically.
 * - When NEXT_PUBLIC_API_URL is configured, uses it.
 * - In browser on physical mobile devices (LAN IP), uses the server's IP with port 3001.
 * - Default fallback to http://localhost:3001.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In the browser, always return "" (relative URL) so all requests hit the Next.js reverse proxy (/api/...) on port 3000.
  // This eliminates CORS errors, firewall blocks, and mobile localhost reference traps.
  if (typeof window !== "undefined") {
    return "";
  }
  // In Node.js SSR runtime on the server, use direct local connection
  return process.env.API_INTERNAL_URL || "http://127.0.0.1:3001";
}
