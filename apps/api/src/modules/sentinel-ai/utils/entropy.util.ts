/**
 * Calculates the Shannon Entropy of a string.
 * Measures the average information content or randomness in bits per character.
 * 
 * Formula: H(X) = - sum( P(x_i) * log2(P(x_i)) )
 * 
 * Benign English domains usually range between 1.5 and 3.2.
 * Algorithmic / DGA (Domain Generation Algorithm) domains exceed 3.8 - 4.5.
 */
export function calculateShannonEntropy(text: string): number {
  if (!text || text.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (const char of text) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  const length = text.length;
  let entropy = 0;

  for (const count of frequencies.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }

  // Round to 4 decimal places for precision
  return Math.round(entropy * 10000) / 10000;
}
