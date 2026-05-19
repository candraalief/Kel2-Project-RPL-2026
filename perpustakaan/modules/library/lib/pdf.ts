import type { XlsxSheet } from "./xlsx";

type PdfReportOptions = {
  title: string;
  subtitle: string;
  sheets: XlsxSheet[];
};

type Color = [number, number, number];

type PdfPage = {
  commands: string[];
  number: number;
  y: number;
};

type TableColumn = {
  align: "left" | "center" | "right";
  label: string;
  width: number;
  x: number;
};

type PreparedCell = {
  align: TableColumn["align"];
  lines: string[];
  width: number;
  x: number;
};

const pageWidth = 842;
const pageHeight = 595;
const marginX = 34;
const marginBottom = 32;
const contentTopY = 506;
const tableWidth = pageWidth - marginX * 2;
const cellPaddingX = 5;
const headerFontSize = 7.4;
const bodyFontSize = 7.2;
const headerLineHeight = 8.4;
const bodyLineHeight = 8.8;
const maxBodyCellLines = 3;

const colors = {
  border: [0.78, 0.82, 0.88] as Color,
  headerBackground: [0.08, 0.28, 0.55] as Color,
  headerText: [1, 1, 1] as Color,
  mutedText: [0.38, 0.42, 0.5] as Color,
  rowAlt: [0.96, 0.98, 1] as Color,
  rowWhite: [1, 1, 1] as Color,
  section: [0.08, 0.12, 0.2] as Color,
  title: [0.06, 0.09, 0.16] as Color,
};

export function createPdfReport({ title, subtitle, sheets }: PdfReportOptions) {
  const reportSheets =
    sheets.length > 0
      ? sheets
      : [
          {
            name: "Laporan",
            columns: ["Informasi"],
            rows: [["Tidak ada data."]],
          },
        ];

  return buildPdf(buildReportPageStreams(title, subtitle, reportSheets));
}

function buildReportPageStreams(
  title: string,
  subtitle: string,
  sheets: XlsxSheet[]
) {
  const pages: PdfPage[] = [];
  let page = createPage(title, subtitle, pages.length + 1);

  pages.push(page);

  sheets.forEach((sheet) => {
    const columns = buildColumns(sheet);

    page = ensureSpace(
      pages,
      page,
      title,
      subtitle,
      measureSheetIntroHeight(sheet.name, columns)
    );
    drawSheetIntro(page, sheet.name, columns);

    if (sheet.rows.length === 0) {
      page = ensureSpace(pages, page, title, subtitle, 28);
      drawEmptyRow(page, columns);
      return;
    }

    sheet.rows.forEach((row, rowIndex) => {
      const preparedCells = prepareCells(row, columns);
      const rowHeight = measureBodyRowHeight(preparedCells);

      if (page.y - rowHeight < marginBottom) {
        page = createPage(title, subtitle, pages.length + 1);
        pages.push(page);
        drawSheetIntro(page, `${sheet.name} (lanjutan)`, columns);
      }

      drawBodyRow(page, preparedCells, rowHeight, rowIndex);
    });

    page.y -= 12;
  });

  return pages.map((item) => item.commands.join("\n"));
}

function createPage(title: string, subtitle: string, pageNumber: number): PdfPage {
  const page: PdfPage = {
    commands: [],
    number: pageNumber,
    y: contentTopY,
  };

  drawText(page, title, marginX, pageHeight - 36, 15, "F2", colors.title);
  drawText(page, subtitle, marginX, pageHeight - 53, 8.5, "F1", colors.mutedText);
  drawAlignedText(
    page,
    `Halaman ${pageNumber}`,
    pageWidth - marginX,
    pageHeight - 36,
    8,
    "F1",
    colors.mutedText,
    "right"
  );
  drawLine(page, marginX, pageHeight - 67, pageWidth - marginX, pageHeight - 67);

  return page;
}

function ensureSpace(
  pages: PdfPage[],
  page: PdfPage,
  title: string,
  subtitle: string,
  height: number
) {
  if (page.y - height >= marginBottom) {
    return page;
  }

  const nextPage = createPage(title, subtitle, pages.length + 1);

  pages.push(nextPage);
  return nextPage;
}

function measureSheetIntroHeight(sheetName: string, columns: TableColumn[]) {
  return measureSectionTitleHeight(sheetName) + measureHeaderHeight(columns) + 8;
}

function drawSheetIntro(page: PdfPage, sheetName: string, columns: TableColumn[]) {
  const titleHeight = measureSectionTitleHeight(sheetName);

  drawText(page, sheetName, marginX, page.y, 10.5, "F2", colors.section);
  page.y -= titleHeight;
  drawHeaderRow(page, columns, measureHeaderHeight(columns));
}

function measureSectionTitleHeight(value: string) {
  return wrapText(value, tableWidth, 10.5, 2).length * 11 + 9;
}

function buildColumns(sheet: XlsxSheet): TableColumn[] {
  const labels = sheet.columns.length > 0 ? sheet.columns : ["Informasi"];
  const widths = calculateColumnWidths(labels, sheet.rows);
  let x = marginX;

  return labels.map((label, index) => {
    const column = {
      align: getColumnAlignment(label),
      label: sanitizePdfText(label) || "-",
      width: widths[index],
      x,
    };

    x += column.width;
    return column;
  });
}

function calculateColumnWidths(columns: string[], rows: XlsxSheet["rows"]) {
  const specs = columns.map((column, index) => {
    const bounds = getColumnBounds(column);
    const values = rows
      .slice(0, 80)
      .map((row) => sanitizePdfText(String(row[index] ?? "")));
    const measured = Math.max(
      measureText(column, headerFontSize) + 18,
      ...values.map((value) => Math.min(measureText(value, bodyFontSize) + 16, bounds.max))
    );

    return {
      ...bounds,
      desired: Math.max(bounds.min, Math.min(measured, bounds.max)),
    };
  });

  let widths = specs.map((spec) => spec.desired);
  const totalDesired = sum(widths);

  if (totalDesired > tableWidth) {
    const shrinkable = sum(specs.map((spec) => spec.desired - spec.min));
    const overflow = totalDesired - tableWidth;

    widths =
      shrinkable > 0
        ? specs.map((spec) =>
            spec.desired - overflow * ((spec.desired - spec.min) / shrinkable)
          )
        : widths.map((width) => width * (tableWidth / totalDesired));
  } else if (totalDesired < tableWidth) {
    const growable = sum(specs.map((spec) => spec.max - spec.desired));
    const extra = tableWidth - totalDesired;

    widths =
      growable > 0
        ? specs.map((spec) =>
            spec.desired + extra * ((spec.max - spec.desired) / growable)
          )
        : widths.map((width) => width + extra / widths.length);
  }

  const rounded = widths.map((width) => Math.max(28, Math.round(width)));
  const correction = tableWidth - sum(rounded);

  rounded[rounded.length - 1] += correction;
  return rounded;
}

function getColumnBounds(label: string) {
  const normalized = label.toLowerCase();

  if (/^id\b|ranking/.test(normalized)) {
    return { min: 46, max: 60 };
  }

  if (normalized.includes("kelas")) {
    return { min: 48, max: 68 };
  }

  if (
    normalized.includes("tanggal") ||
    normalized.includes("waktu") ||
    normalized.includes("jatuh tempo")
  ) {
    return { min: 86, max: 110 };
  }

  if (normalized.includes("status")) {
    return { min: 66, max: 84 };
  }

  if (
    normalized.includes("total") ||
    normalized.includes("sedang") ||
    normalized.includes("tepat") ||
    normalized.includes("terlambat") ||
    normalized.includes("eksemplar")
  ) {
    return { min: 70, max: 92 };
  }

  if (
    normalized.includes("judul") ||
    normalized.includes("tujuan") ||
    normalized.includes("instansi")
  ) {
    return { min: 130, max: 230 };
  }

  if (normalized.includes("nama") || normalized.includes("penulis")) {
    return { min: 106, max: 185 };
  }

  return { min: 76, max: 150 };
}

function getColumnAlignment(label: string): TableColumn["align"] {
  const normalized = label.toLowerCase();

  if (
    /^id\b/.test(normalized) ||
    normalized.includes("kelas") ||
    normalized.includes("tanggal") ||
    normalized.includes("waktu") ||
    normalized.includes("status")
  ) {
    return "center";
  }

  if (
    normalized.includes("total") ||
    normalized.includes("sedang") ||
    normalized.includes("tepat") ||
    normalized.includes("terlambat") ||
    normalized.includes("ranking") ||
    normalized.includes("eksemplar")
  ) {
    return "right";
  }

  return "left";
}

function measureHeaderHeight(columns: TableColumn[]) {
  const lineCount = Math.max(
    1,
    ...columns.map((column) =>
      wrapText(column.label, column.width - cellPaddingX * 2, headerFontSize, 2)
        .length
    )
  );

  return Math.max(25, lineCount * headerLineHeight + 12);
}

function drawHeaderRow(page: PdfPage, columns: TableColumn[], height: number) {
  columns.forEach((column) => {
    const lines = wrapText(
      column.label,
      column.width - cellPaddingX * 2,
      headerFontSize,
      2
    );

    drawRect(
      page,
      column.x,
      page.y - height,
      column.width,
      height,
      colors.headerBackground,
      colors.headerBackground
    );
    drawCellText(page, {
      align: "center",
      lines,
      width: column.width,
      x: column.x,
    }, page.y, height, headerFontSize, headerLineHeight, "F2", colors.headerText);
  });

  drawTableGrid(page, columns, page.y, height);
  page.y -= height;
}

function prepareCells(row: XlsxSheet["rows"][number], columns: TableColumn[]) {
  return columns.map((column, index) => ({
    align: column.align,
    lines: wrapText(
      String(row[index] ?? "") || "-",
      column.width - cellPaddingX * 2,
      bodyFontSize,
      maxBodyCellLines
    ),
    width: column.width,
    x: column.x,
  }));
}

function measureBodyRowHeight(cells: PreparedCell[]) {
  const lineCount = Math.max(1, ...cells.map((cell) => cell.lines.length));

  return Math.max(24, lineCount * bodyLineHeight + 12);
}

function drawBodyRow(
  page: PdfPage,
  cells: PreparedCell[],
  height: number,
  rowIndex: number
) {
  const fill = rowIndex % 2 === 0 ? colors.rowWhite : colors.rowAlt;

  cells.forEach((cell) => {
    drawRect(page, cell.x, page.y - height, cell.width, height, fill, colors.border);
    drawCellText(page, cell, page.y, height, bodyFontSize, bodyLineHeight, "F1", colors.title);
  });

  page.y -= height;
}

function drawEmptyRow(page: PdfPage, columns: TableColumn[]) {
  const height = 28;

  drawRect(page, marginX, page.y - height, tableWidth, height, colors.rowWhite, colors.border);
  drawText(
    page,
    "Tidak ada data.",
    marginX + cellPaddingX,
    page.y - 17,
    bodyFontSize,
    "F1",
    colors.mutedText
  );
  drawTableGrid(page, columns, page.y, height);
  page.y -= height;
}

function drawCellText(
  page: PdfPage,
  cell: PreparedCell,
  topY: number,
  height: number,
  fontSize: number,
  lineHeight: number,
  font: "F1" | "F2",
  color: Color
) {
  const textBlockHeight = cell.lines.length * lineHeight;
  const firstBaseline =
    topY - Math.max(6, (height - textBlockHeight) / 2 + fontSize * 0.75);

  cell.lines.forEach((line, index) => {
    drawAlignedText(
      page,
      line,
      cell.align === "left"
        ? cell.x + cellPaddingX
        : cell.align === "right"
          ? cell.x + cell.width - cellPaddingX
          : cell.x + cell.width / 2,
      firstBaseline - index * lineHeight,
      fontSize,
      font,
      color,
      cell.align
    );
  });
}

function drawTableGrid(
  page: PdfPage,
  columns: TableColumn[],
  topY: number,
  height: number
) {
  let x = marginX;

  drawLine(page, marginX, topY, marginX + tableWidth, topY, colors.border, 0.45);
  drawLine(
    page,
    marginX,
    topY - height,
    marginX + tableWidth,
    topY - height,
    colors.border,
    0.45
  );

  columns.forEach((column) => {
    drawLine(page, x, topY, x, topY - height, colors.border, 0.45);
    x += column.width;
  });

  drawLine(page, marginX + tableWidth, topY, marginX + tableWidth, topY - height, colors.border, 0.45);
}

function wrapText(
  value: string,
  maxWidth: number,
  fontSize: number,
  maxLines = Number.POSITIVE_INFINITY
) {
  const normalized = sanitizePdfText(value) || "-";
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidates = measureText(word, fontSize) > maxWidth
      ? splitLongWord(word, maxWidth, fontSize)
      : [word];

    for (const candidate of candidates) {
      const next = current ? `${current} ${candidate}` : candidate;

      if (measureText(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }

        current = candidate;
      }

      if (lines.length === maxLines) {
        return clampLastLine(lines, maxWidth, fontSize);
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return clampLastLine(lines.slice(0, maxLines), maxWidth, fontSize);
  }

  return lines.length > 0 ? lines : ["-"];
}

function splitLongWord(word: string, maxWidth: number, fontSize: number) {
  const chunks: string[] = [];
  let current = "";

  for (const char of word) {
    const next = current + char;

    if (measureText(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    current = char;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function clampLastLine(lines: string[], maxWidth: number, fontSize: number) {
  if (lines.length === 0) {
    return ["-"];
  }

  const nextLines = [...lines];
  let last = nextLines[nextLines.length - 1];

  while (last.length > 1 && measureText(`${last}...`, fontSize) > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }

  nextLines[nextLines.length - 1] = `${last || "."}...`;
  return nextLines;
}

function measureText(value: string, fontSize: number) {
  return [...sanitizePdfText(value)].reduce((total, char) => {
    if (char === " ") {
      return total + fontSize * 0.28;
    }

    if (/[A-Z]/.test(char)) {
      return total + fontSize * 0.62;
    }

    if (/[0-9]/.test(char)) {
      return total + fontSize * 0.52;
    }

    if (/[,.;:!'"()[\]/-]/.test(char)) {
      return total + fontSize * 0.32;
    }

    return total + fontSize * 0.5;
  }, 0);
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function drawRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Color,
  stroke: Color
) {
  page.commands.push(
    `${formatColor(fill)} rg`,
    `${formatColor(stroke)} RG`,
    `0.45 w`,
    `${round(x)} ${round(y)} ${round(width)} ${round(height)} re B`
  );
}

function drawLine(
  page: PdfPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Color = colors.border,
  width = 0.6
) {
  page.commands.push(
    `${formatColor(color)} RG`,
    `${width} w`,
    `${round(x1)} ${round(y1)} m ${round(x2)} ${round(y2)} l S`
  );
}

function drawText(
  page: PdfPage,
  value: string,
  x: number,
  y: number,
  fontSize: number,
  font: "F1" | "F2",
  color: Color
) {
  page.commands.push(
    "BT",
    `/${font} ${fontSize} Tf`,
    `${formatColor(color)} rg`,
    `${round(x)} ${round(y)} Td`,
    `${escapePdfString(sanitizePdfText(value))} Tj`,
    "ET"
  );
}

function drawAlignedText(
  page: PdfPage,
  value: string,
  x: number,
  y: number,
  fontSize: number,
  font: "F1" | "F2",
  color: Color,
  align: "left" | "center" | "right"
) {
  const text = sanitizePdfText(value);
  const textWidth = measureText(text, fontSize);
  const nextX =
    align === "right" ? x - textWidth : align === "center" ? x - textWidth / 2 : x;

  drawText(page, text, nextX, y, fontSize, font, color);
}

function buildPdf(pageStreams: string[]) {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pageStreams.forEach((stream) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;

    pageObjectIds.push(pageObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
        `/Contents ${contentObjectId} 0 R >>`
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    );
  });

  objects[1] =
    `<< /Type /Pages /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageObjectIds.length} >>`;

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

function formatColor(color: Color) {
  return color.map((item) => round(item)).join(" ");
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function escapePdfString(value: string) {
  return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}
