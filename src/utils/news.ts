const mojibakeReplacements: Record<string, string> = {
  'â': '’',
  'â': '‘',
  'â': '“',
  'â': '”',
  'â': '—',
  'â': '–',
  'â¦': '…',
  'Â': '',
};

const namedEntities: Record<string, string> = {
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

/** Normalizes common provider encoding artifacts without interpreting HTML markup. */
export function cleanNewsText(input: string): string {
  let output = input;
  Object.entries(mojibakeReplacements).forEach(([encoded, decoded]) => {
    output = output.split(encoded).join(decoded);
  });
  Object.entries(namedEntities).forEach(([encoded, decoded]) => {
    output = output.split(encoded).join(decoded);
  });
  output = output.replace(/&#(x?[0-9a-f]+);/gi, (entity, value: string) => {
    const hexadecimal = value.toLocaleLowerCase().startsWith('x');
    const codePoint = Number.parseInt(hexadecimal ? value.slice(1) : value, hexadecimal ? 16 : 10);
    try {
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    } catch {
      return entity;
    }
  });
  return output.replace(/\s+/g, ' ').trim();
}
