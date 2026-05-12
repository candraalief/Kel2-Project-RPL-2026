export function normalizeCatalogShelfLocation(value: string) {
  const code = value
    .trim()
    .replace(/^rak\b/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  return code ? `Rak ${code}` : "";
}
