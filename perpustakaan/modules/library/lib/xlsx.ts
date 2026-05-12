type SheetCell = string | number | null | undefined;

export type XlsxSheet = {
  name: string;
  columns: string[];
  rows: SheetCell[][];
};

type ZipEntry = {
  name: string;
  content: Buffer;
  crc: number;
  offset: number;
};

const crcTable = makeCrcTable();

export function createXlsxWorkbook(sheets: XlsxSheet[]) {
  const workbookSheets = sheets.length > 0 ? sheets : [
    {
      name: "Laporan",
      columns: ["Informasi"],
      rows: [["Tidak ada data."]],
    },
  ];
  const files = new Map<string, string>();

  files.set("[Content_Types].xml", buildContentTypes(workbookSheets.length));
  files.set("_rels/.rels", buildRootRelationships());
  files.set("xl/workbook.xml", buildWorkbookXml(workbookSheets));
  files.set("xl/_rels/workbook.xml.rels", buildWorkbookRelationships(workbookSheets.length));
  files.set("xl/styles.xml", buildStylesXml());

  workbookSheets.forEach((sheet, index) => {
    files.set(`xl/worksheets/sheet${index + 1}.xml`, buildWorksheetXml(sheet));
  });

  return createZip(
    Array.from(files.entries()).map(([name, content]) => ({
      name,
      content: Buffer.from(content, "utf8"),
    }))
  );
}

function buildContentTypes(sheetCount: number) {
  const worksheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");

  return xmlDeclaration(
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      worksheetOverrides +
      `</Types>`
  );
}

function buildRootRelationships() {
  return xmlDeclaration(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`
  );
}

function buildWorkbookXml(sheets: XlsxSheet[]) {
  const sheetXml = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXmlAttribute(truncateSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  return xmlDeclaration(
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>${sheetXml}</sheets>` +
      `</workbook>`
  );
}

function buildWorkbookRelationships(sheetCount: number) {
  const sheetRelationships = Array.from({ length: sheetCount }, (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");

  return xmlDeclaration(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheetRelationships +
      `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`
  );
}

function buildStylesXml() {
  return xmlDeclaration(
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2">` +
      `<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>` +
      `<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>` +
      `</fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`
  );
}

function buildWorksheetXml(sheet: XlsxSheet) {
  const rows = [sheet.columns, ...sheet.rows];
  const columnWidths = sheet.columns
    .map((column, index) => {
      const maxLength = Math.max(
        column.length,
        ...sheet.rows.map((row) => String(row[index] ?? "").length)
      );
      const width = Math.min(Math.max(maxLength + 4, 12), 48);

      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) =>
          buildCell(value, `${columnName(columnIndex + 1)}${rowIndex + 1}`, rowIndex === 0)
        )
        .join("");

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return xmlDeclaration(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
      `<cols>${columnWidths}</cols>` +
      `<sheetData>${rowXml}</sheetData>` +
      `</worksheet>`
  );
}

function buildCell(value: SheetCell, reference: string, header = false) {
  const style = header ? ` s="1"` : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }

  const text = String(value ?? "");

  return `<c r="${reference}" t="inlineStr"${style}><is><t>${escapeXmlText(text)}</t></is></c>`;
}

function columnName(index: number) {
  let value = index;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function truncateSheetName(value: string) {
  return value.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
}

function xmlDeclaration(value: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`;
}

function escapeXmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttribute(value: string) {
  return escapeXmlText(value).replace(/"/g, "&quot;");
}

function createZip(files: Array<{ name: string; content: Buffer }>) {
  const localParts: Buffer[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const crc = crc32(file.content);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.content.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, file.content);
    entries.push({
      name: file.name,
      content: file.content,
      crc,
      offset,
    });
    offset += localHeader.length + nameBuffer.length + file.content.length;
  }

  const centralDirectoryParts: Buffer[] = [];
  let centralDirectorySize = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const centralHeader = Buffer.alloc(46);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(entry.crc, 16);
    centralHeader.writeUInt32LE(entry.content.length, 20);
    centralHeader.writeUInt32LE(entry.content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(entry.offset, 42);

    centralDirectoryParts.push(centralHeader, nameBuffer);
    centralDirectorySize += centralHeader.length + nameBuffer.length;
  }

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectorySize, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralDirectoryParts, endRecord]);
}

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    return value >>> 0;
  });
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
