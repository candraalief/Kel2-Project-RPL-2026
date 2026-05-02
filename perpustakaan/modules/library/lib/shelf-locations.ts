export const CATALOG_SHELF_LOCATIONS = Array.from(
  { length: 10 },
  (_, letterIndex) => String.fromCharCode(65 + letterIndex)
).flatMap((letter) =>
  Array.from({ length: 6 }, (_, numberIndex) => `Rak ${letter}${numberIndex + 1}`)
);

export function isCatalogShelfLocation(value: string) {
  return CATALOG_SHELF_LOCATIONS.includes(value);
}
