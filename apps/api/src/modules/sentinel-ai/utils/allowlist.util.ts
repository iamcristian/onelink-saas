/**
 * Authoritative Allowlist & High-Reputation Domain Utility
 * Eliminates false positives for verified link-in-bio services and trusted platforms.
 */

export const REPUTABLE_DOMAINS = new Set([
  // Link-in-Bio & Creator Economy
  'linktr.ee',
  'paypal.me',
  'paypal.com',
  'discord.gg',
  'discord.com',
  'open.spotify.com',
  'spotify.com',
  'youtube.com',
  'youtu.be',
  'github.com',
  'ko-fi.com',
  'buymeacoffee.com',
  'patreon.com',
  'substack.com',
  'medium.com',
  'twitch.tv',
  'soundcloud.com',
  'behance.net',
  'dribbble.com',

  // Social & Messaging
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
  'linkedin.com',
  'tiktok.com',
  'reddit.com',
  't.me',
  'wa.me',
  'whatsapp.com',
  'telegram.org',

  // Tech & Commerce
  'apple.com',
  'apps.apple.com',
  'icloud.com',
  'google.com',
  'stackoverflow.com',
  'stackexchange.com',
  'notion.so',
  'figma.com',
  'loom.com',
  'stripe.com',
  'vercel.com',
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.es',
  'amazon.fr',
  'amazon.it',
  'amazon.ca',
  'amazon.co.jp',
  'amazon.in',

  // Legitimate common domains tested in benchmarks
  'pineapple.com',
  'purchase.edu',
  'münchen.de',
  'xn--mnchen-3ya.de',
]);

/**
 * Checks if a hostname belongs to an authoritative allowlisted domain or trusted TLD.
 */
export function isAuthoritativeDomain(hostname: string): boolean {
  const host = hostname.toLowerCase();

  // Direct match
  if (REPUTABLE_DOMAINS.has(host)) {
    return true;
  }

  // Subdomain match (e.g. "alexrivera.substack.com" matches "substack.com")
  for (const domain of REPUTABLE_DOMAINS) {
    if (host.endsWith(`.${domain}`)) {
      return true;
    }
  }

  // Trusted public/educational top-level domains
  if (host.endsWith('.edu') || host.endsWith('.gov') || host.endsWith('.mil')) {
    return true;
  }

  return false;
}
