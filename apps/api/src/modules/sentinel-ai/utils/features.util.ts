import { calculateShannonEntropy } from './entropy.util';

export const SUSPICIOUS_TLDS = new Set([
  '.top',
  '.xyz',
  '.click',
  '.buzz',
  '.cam',
  '.work',
  '.rest',
  '.loan',
  '.fit',
  '.kim',
  '.sbs',
  '.cfd',
  '.gq',
  '.ml',
  '.cf',
  '.tk',
  '.ga',
]);

export const CRYPTO_KEYWORDS = [
  'airdrop',
  'claim-free',
  'walletconnect',
  'seed-phrase',
  'drainer',
  'free-nft',
  'crypto-giveaway',
  'mint-pass',
  'presale-tokens',
];

export const AUTH_KEYWORDS = [
  'signin',
  'login',
  'verify',
  'banking',
  'secure-account',
  'update-password',
  'auth-token',
  'confirm-identity',
  'account-recovery',
];

export const URL_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'cutt.ly',
  'is.gd',
  'rb.gy',
  'shorturl.at',
]);

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

export interface ExtractedFeatures {
  vector: Float32Array;
  primaryLabel: string;
  entropy: number;
  hasIp: boolean;
  isPunycode: boolean;
  hasSuspiciousTld: boolean;
  hasCryptoKeywords: boolean;
  hasAuthPathKeywords: boolean;
  isShortener: boolean;
}

/**
 * Extracts 16 numerical features from an input URL matching the Python ML pipeline exactly.
 */
export function extractUrlFeatures(urlStr: string): ExtractedFeatures {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    parsed = new URL('http://invalid.domain/');
  }

  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }
  const pathname = parsed.pathname.toLowerCase();
  // Strip leading '?' to match Python's parsed.query
  const query = parsed.search ? parsed.search.replace(/^\?/, '').toLowerCase() : '';

  const parts = hostname.split('.');
  const hasIp = IPV4_REGEX.test(hostname);

  let primaryLabel = '';
  let subdomainCount = 0;

  if (hasIp) {
    primaryLabel = hostname;
    subdomainCount = 0;
  } else {
    // Check two-part ccTLDs like .co.uk, .com.br
    if (parts.length >= 3 && ['co', 'com', 'org', 'edu', 'gov', 'net'].includes(parts[parts.length - 2])) {
      primaryLabel = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
      subdomainCount = Math.max(0, parts.length - 3);
    } else {
      primaryLabel = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || '');
      subdomainCount = Math.max(0, parts.length - 2);
    }
  }

  const entropy = calculateShannonEntropy(primaryLabel);

  let hasSuspiciousTld = false;
  for (const tld of SUSPICIOUS_TLDS) {
    if (hostname.endsWith(tld)) {
      hasSuspiciousTld = true;
      break;
    }
  }

  const fullStr = `${hostname}${pathname}${query}`;
  const hasCryptoKeywords = CRYPTO_KEYWORDS.some((kw) => fullStr.includes(kw));
  const hasAuthPathKeywords = AUTH_KEYWORDS.some((kw) => pathname.includes(kw));

  let isShortener = false;
  for (const s of URL_SHORTENERS) {
    if (hostname === s || hostname.endsWith(`.${s}`)) {
      isShortener = true;
      break;
    }
  }

  const isPunycode = hostname.includes('xn--');

  const digitCount = (hostname.match(/\d/g) || []).length;
  const digitRatio = digitCount / Math.max(hostname.length, 1);

  const dotCount = (hostname.match(/\./g) || []).length;
  const hyphenCount = (hostname.match(/-/g) || []).length;

  const vector = new Float32Array([
    urlStr.length,                                    // 0: url_length
    hostname.length,                                  // 1: domain_length
    pathname.length,                                  // 2: path_length
    query.length,                                     // 3: query_length
    dotCount,                                         // 4: dot_count
    hyphenCount,                                      // 5: hyphen_count
    Math.round(digitRatio * 10000) / 10000,           // 6: digit_ratio
    subdomainCount,                                   // 7: subdomain_count
    hasIp ? 1.0 : 0.0,                                // 8: has_ip_address
    isPunycode ? 1.0 : 0.0,                           // 9: is_punycode
    entropy,                                          // 10: entropy
    hasSuspiciousTld ? 1.0 : 0.0,                     // 11: has_suspicious_tld
    hasCryptoKeywords ? 1.0 : 0.0,                    // 12: has_crypto_keywords
    hasAuthPathKeywords ? 1.0 : 0.0,                  // 13: has_auth_path_keywords
    isShortener ? 1.0 : 0.0,                          // 14: is_url_shortener
    parsed.protocol === 'https:' ? 1.0 : 0.0,         // 15: is_https
  ]);

  return {
    vector,
    primaryLabel,
    entropy,
    hasIp,
    isPunycode,
    hasSuspiciousTld,
    hasCryptoKeywords,
    hasAuthPathKeywords,
    isShortener,
  };
}
