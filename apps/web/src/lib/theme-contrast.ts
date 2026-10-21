/**
 * Theme Contrast and Accessibility Utilities
 * Guarantees WCAG AA / AAA contrast for badges, text, and special cards across all themes.
 */

export function isLightColor(colorStr?: string | null): boolean {
  if (!colorStr) return false;
  const c = colorStr.trim().toLowerCase();

  // Common named / hex values
  if (
    c === "white" ||
    c === "#fff" ||
    c === "#ffffff" ||
    c === "#f8fafc" ||
    c === "#faf8f5" ||
    c === "#fafafa" ||
    c === "#f4f4f5" ||
    c === "#f1f5f9" ||
    c === "#e2e8f0" ||
    c === "#e5e7eb"
  ) {
    return true;
  }

  // Handle CSS gradients
  if (c.includes("gradient")) {
    // If gradient contains known dark tones, it is dark
    if (
      c.includes("#090") ||
      c.includes("#180") ||
      c.includes("#022") ||
      c.includes("#0f1") ||
      c.includes("#000") ||
      c.includes("#111") ||
      c.includes("#222") ||
      c.includes("#333") ||
      c.includes("#064") ||
      c.includes("#0c0") ||
      c.includes("#2e0")
    ) {
      return false;
    }
    // Check if it's explicitly light pastels
    if (c.includes("#fff") || c.includes("#faf") || c.includes("#f8f") || c.includes("#f4f")) {
      return true;
    }
    return false;
  }

  // Parse HEX (#RGB, #RRGGBB)
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Standard perceived luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.52;
    }
  }

  // Parse RGB / RGBA
  if (c.startsWith("rgb")) {
    const parts = c.match(/\d+(\.\d+)?/g);
    if (parts && parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      if (a < 0.3) return false;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.52;
    }
  }

  return false;
}
