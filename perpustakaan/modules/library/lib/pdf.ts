import type { XlsxSheet } from "./xlsx";

type PdfReportOptions = {
  title: string;
  subtitle: string;
  sheets: XlsxSheet[];
};

const pageWidth = 842;
const pageHeight = 595;
const marginX = 36;
const startY = 554;
const lineHeight = 11;
const maxLineCharacters = 150;
const maxLinesPerPage = 46;

export function createPdfReport({ title, subtitle, sheets }: PdfReportOptions) {
  const lines = buildReportLines(title, subtitle, sheets);
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  return buildPdf(pages.length > 0 ? pages : [["Tidak ada data laporan."]]);
}

function buildReportLines(title: string, subtitle: string, sheets: XlsxSheet[]) {
  const lines = [title, subtitle, ""];

  sheets.forEach((sheet, sheetIndex) => {
    if (sheetIndex > 0) {
      lines.push("");
    }

    lines.push(sheet.name);
    lines.push(formatDelimitedRow(sheet.columns));
    lines.push("-".repeat(Math.min(maxLineCharacters, 120)));

    if (sheet.rows.length === 0) {
      lines.push("Tidak ada data.");
      return;
    }

    sheet.rows.forEach((row) => {
      lines.push(formatDelimitedRow(row.map((cell) => String(cell ?? ""))));
    });
  });

  return lines.flatMap(splitLongLine);
}

function formatDelimitedRow(values: string[]) {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim() || "-")
    .join(" | ");
}

function splitLongLine(value: string) {
  const normalized = sanitizePdfText(value);

  if (normalized.length <= maxLineCharacters) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLineCharacters) {
    chunks.push(remaining.slice(0, maxLineCharacters));
    remaining = `  ${remaining.slice(maxLineCharacters)}`;
  }

  if (remaining.trim()) {
    chunks.push(remaining);
  }

  return chunks;
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPdf(pages: string[][]) {
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] =
    `<< /Type /Pages /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  pages.forEach((pageLines, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const stream = buildPageStream(pageLines);

    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
  });

  const parts: string[] = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(parts.join(""), "utf8");
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(parts.join(""), "utf8");
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");

  for (let index = 1; index <= objects.length; index += 1) {
    parts.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }

  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.from(parts.join(""), "utf8");
}

function buildPageStream(lines: string[]) {
  const commands = [
    "BT",
    `/F2 8 Tf`,
    `${marginX} ${startY} Td`,
  ];

  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push(`0 -${lineHeight} Td`);
    }

    commands.push(`${escapePdfString(line)} Tj`);
  });

  commands.push("ET");

  return commands.join("\n");
}

function escapePdfString(value: string) {
  return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}
