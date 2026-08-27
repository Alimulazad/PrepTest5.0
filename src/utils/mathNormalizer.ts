/**
 * Comprehensive Math & Text Normalizer for Admission Questions
 * Handles LaTeX syntax normalization, delimiter conversions (\( -> $, \[ -> $$),
 * UTF-8 Mojibake fixing, and math rendering optimizations for KaTeX/ReactMarkdown.
 */

const CP1252_REVERSE: Record<string, number> = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F,
};

/**
 * Automatically repairs UTF-8 Mojibake (e.g. à¦¬à§‹à¦° -> বোর, Ã… -> Å)
 * that occurs when UTF-8 bytes are mistakenly decoded as Latin-1/CP1252.
 */
export function fixMojibake(str: string): string {
  if (!str || typeof str !== 'string') return str || '';

  // Check if string contains characteristic UTF-8 mojibake character sequences
  if (
    str.includes('à¦') ||
    str.includes('à§') ||
    str.includes('Ã…') ||
    str.includes('Ã') ||
    /[\u00C0-\u00DF][\u0080-\u00BF]/.test(str)
  ) {
    try {
      const bytes: number[] = [];
      let canDecode = true;

      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (CP1252_REVERSE[char] !== undefined) {
          bytes.push(CP1252_REVERSE[char]);
        } else {
          const code = str.charCodeAt(i);
          if (code <= 0xff) {
            bytes.push(code);
          } else {
            canDecode = false;
            break;
          }
        }
      }

      if (canDecode && bytes.length > 0) {
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
        if (decoded && !decoded.includes('\uFFFD') && decoded !== str) {
          return decoded;
        }
      }
    } catch {
      // ignore and return original
    }
  }
  return str;
}

/**
 * Normalizes LaTeX math formulas and delimiters so they render properly with KaTeX:
 * 1. Converts \( ... \) and \\( ... \\) to $ ... $
 * 2. Converts \[ ... \] and \\\[ ... \\\] to $$ ... $$
 * 3. Cleans double-escaped backslashes in math commands (e.g. \\dfrac -> \dfrac, \\pi -> \pi)
 * 4. Recognizes LaTeX commands wrapped in raw parentheses like `( \lambda = \dfrac{h}{mv} )` or `( E = h\nu )`
 * 5. Normalizes standalone LaTeX formulas without delimiters in option cards.
 */
export function normalizeLatexMath(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return rawText || '';

  let text = fixMojibake(rawText);

  // 1. Convert display math delimiters: \[ ... \] or \\[ ... \\] -> $$ ... $$
  text = text.replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, math) => {
    return `$$${cleanMathContent(math)}$$`;
  });

  // 2. Convert inline math delimiters: \( ... \) or \\( ... \\) -> $ ... $
  text = text.replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, math) => {
    return `$${cleanMathContent(math)}$`;
  });

  // 3. Clean already delimited $...$ or $$...$$ content
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return `$$${cleanMathContent(math)}$$`;
  });

  text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    return `$${cleanMathContent(math)}$`;
  });

  // 4. Check for parentheses containing LaTeX commands like `( \lambda = \dfrac{h}{mv} )` or `( E = h\nu )` or `( mvr = \dfrac{nh}{2\pi} )`
  // that were not escaped or where backslashes were stripped
  text = text.replace(/\(\s*([^\(\)\n]*?\\[a-zA-Z]+[^\(\)\n]*?)\s*\)/g, (match, inner) => {
    // If it contains LaTeX commands like \lambda, \dfrac, \frac, \times, \nu, \pi, \alpha, \text, \mathrm, \sqrt, etc.
    if (/\\(?:frac|dfrac|lambda|times|pi|nu|mu|alpha|beta|gamma|theta|mathrm|text|sqrt|pm|le|ge|neq|sim|approx|circ|partial|int|sum|Delta|omega|epsilon|sigma|rho|phi|psi|hbar|quad|qquad|left|right)\b/i.test(inner)) {
      return `$${cleanMathContent(inner)}$`;
    }
    return match;
  });

  // 5. If the entire text is a standalone LaTeX expression without $ delimiters
  // (common in MCQ options like `\dfrac{5h}{\pi}` or `\lambda = \dfrac{h}{mv}` or `E = mc^2` or `\pi = CRT`)
  const trimmed = text.trim();
  if (
    !trimmed.startsWith('$') &&
    !trimmed.endsWith('$') &&
    !trimmed.includes('$') &&
    !trimmed.includes('\n')
  ) {
    if (
      /\\(?:frac|dfrac|lambda|times|pi|nu|mu|alpha|beta|gamma|theta|mathrm|sqrt|pm|le|ge|neq|Delta|omega|epsilon|sigma|rho|phi|psi|hbar)\b/i.test(trimmed) ||
      /^[a-zA-Z]\s*=\s*(?:[a-zA-Z0-9\^_\+\-\*\/\\]|\\[a-zA-Z]+)+$/.test(trimmed) ||
      /\b(?:\\mathrm\{[^\}]+\}|\\[a-zA-Z]+)\b/.test(trimmed)
    ) {
      text = `$${cleanMathContent(trimmed)}$`;
    }
  }

  return text;
}

/**
 * Cleans the inside of a LaTeX math block:
 * - Replaces double backslashes before commands with single backslash (e.g. \\dfrac -> \dfrac)
 * - Keeps \\ when used for line breaks in matrices/align environments
 */
function cleanMathContent(math: string): string {
  if (!math) return '';

  let cleaned = math.trim();

  // Replace \\command with \command
  cleaned = cleaned.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Replace \\{ or \\} with \{ or \}
  cleaned = cleaned.replace(/\\\\([\{\}])/g, '\\$1');

  // Normalize spaces
  return cleaned;
}
