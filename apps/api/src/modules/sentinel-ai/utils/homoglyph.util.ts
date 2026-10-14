/**
 * Homoglyph and Punycode attack detection.
 * Identifies attempts to spoof trusted brand domains using Cyrillic, Greek,
 * or full-width characters that visually mimic standard Latin characters.
 */

// Common Cyrillic and Greek characters frequently used in look-alike attacks
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', // Cyrillic small letter a
  '\u0435': 'e', // Cyrillic small letter ie
  '\u043E': 'o', // Cyrillic small letter o
  '\u0440': 'p', // Cyrillic small letter er
  '\u0441': 'c', // Cyrillic small letter es
  '\u0443': 'y', // Cyrillic small letter u
  '\u0445': 'x', // Cyrillic small letter ha
  '\u0456': 'i', // Cyrillic small letter byelorussian-ukrainian i
  '\u0458': 'j', // Cyrillic small letter je
  '\u03BF': 'o', // Greek small letter omicron
  '\u03C1': 'p', // Greek small letter rho
  '\u03BD': 'v', // Greek small letter nu
};

export interface HomoglyphScanResult {
  hasHomoglyphs: boolean;
  isPunycode: boolean;
  detectedChars: string[];
  normalizedString: string;
}

export function scanForHomoglyphs(domain: string): HomoglyphScanResult {
  const isPunycode = domain.toLowerCase().includes('xn--');
  const detectedChars: string[] = [];
  let normalized = '';

  for (const char of domain) {
    if (HOMOGLYPH_MAP[char]) {
      detectedChars.push(char);
      normalized += HOMOGLYPH_MAP[char];
    } else {
      normalized += char;
    }
  }

  return {
    hasHomoglyphs: detectedChars.length > 0 || isPunycode,
    isPunycode,
    detectedChars,
    normalizedString: normalized,
  };
}
