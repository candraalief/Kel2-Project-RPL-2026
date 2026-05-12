import { requireRole } from "@/modules/access/lib/guards";
import {
  getAttendanceRecords,
  getDetailedTransactions,
} from "@/modules/library/lib/data";
import {
  buildAttendanceReport,
  buildTransactionReport,
  getDefaultReportStartDate,
  getTodayDateKey,
  normalizeReportDate,
  type AttendanceReportTab,
  type ReportFilters,
  type ReportFormat,
  type ReportType,
  type TransactionReportTab,
} from "@/modules/library/lib/reports";
import { createXlsxWorkbook, type XlsxSheet } from "@/modules/library/lib/xlsx";

export const runtime = "nodejs";

function parseReportType(value: string | null): ReportType {
  if (value === "absensi") {
    return value;
  }

  return "transaksi";
}

function parseReportFormat(value: string | null): ReportFormat {
  return value === "pdf" ? "pdf" : "excel";
}

function parseTransactionTab(value: string | null): TransactionReportTab {
  if (value === "siswa" || value === "buku") {
    return value;
  }

  return "transaksi";
}

function parseAttendanceTab(value: string | null): AttendanceReportTab {
  return value === "umum" ? "umum" : "siswa";
}

function getReportFilters(searchParams: URLSearchParams): ReportFilters {
  const today = getTodayDateKey();
  const defaultStartDate = getDefaultReportStartDate(today);
  let startDate = normalizeReportDate(searchParams.get("mulai") ?? "", defaultStartDate);
  let endDate = normalizeReportDate(searchParams.get("sampai") ?? "", today);

  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }

  return {
    type: parseReportType(searchParams.get("jenis")),
    format: parseReportFormat(searchParams.get("format")),
    startDate,
    endDate,
    tab: parseTransactionTab(searchParams.get("tab")),
    attendanceTab: parseAttendanceTab(searchParams.get("tab")),
  };
}

export async function GET(request: Request) {
  await requireRole("admin");

  const url = new URL(request.url);
  const filters = getReportFilters(url.searchParams);

  if (filters.format !== "excel") {
    return Response.json(
      {
        error: "Pilih format Excel untuk mengunduh laporan.",
      },
      { status: 400 }
    );
  }

  const workbook =
    filters.type === "absensi"
      ? await buildAttendanceWorkbook(filters)
      : await buildBorrowingWorkbook(filters);
  const filename = `laporan-${filters.type === "absensi" ? "absensi" : "peminjaman"}-${filters.startDate}-sampai-${filters.endDate}.xlsx`;

  return new Response(workbook, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "no-store",
    },
  });
}

async function buildBorrowingWorkbook(filters: ReportFilters) {
  const transactions = await getDetailedTransactions();
  const reportData = buildTransactionReport(transactions, filters);

  return createXlsxWorkbook(buildBorrowingReportSheets(reportData));
}

async function buildAttendanceWorkbook(filters: ReportFilters) {
  const attendance = await getAttendanceRecords({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const reportData = buildAttendanceReport(attendance, filters);

  return createXlsxWorkbook(buildAttendanceReportSheets(reportData));
}

function buildBorrowingReportSheets(
  reportData: ReturnType<typeof buildTransactionReport>
): XlsxSheet[] {
  return [
    {
      name: "Semua Peminjaman",
      columns: [
        "ID Peminjaman",
        "Nama Siswa",
        "NISN",
        "Kelas/Jurusan",
        "Tanggal Pinjam",
        "Deadline Kembali",
        "Tanggal Kembali",
        "Total Buku",
        "Status",
        "Info Deadline",
        "Buku",
        "Catatan",
      ],
      rows: reportData.transactions.map((row) => [
        row.id,
        row.studentName,
        row.nisn,
        row.className,
        row.borrowedAt,
        row.dueAt,
        row.returnedAt,
        row.totalBooks,
        row.statusLabel,
        row.deadlineLabel,
        row.booksText,
        row.note,
      ]),
    },
    {
      name: "Rekap Per Siswa",
      columns: [
        "Siswa",
        "NISN",
        "Kelas/Jurusan",
        "Banyak Peminjaman",
        "Peminjaman Aktif",
        "Dikembalikan Tepat Waktu",
        "Dikembalikan Terlambat",
      ],
      rows: reportData.students.map((row) => [
        row.studentName,
        row.nisn,
        row.className,
        row.totalTransactions,
        row.activeTransactions,
        row.returnedOnTimeTransactions,
        row.returnedLateTransactions,
      ]),
    },
    {
      name: "Rekap Buku",
      columns: [
        "Judul Buku",
        "Penulis",
        "Total Eksemplar Dipinjam Dalam Periode Ini",
        "Eksemplar Hilang Dalam Periode Ini",
      ],
      rows: reportData.books.map((row) => [
        row.title,
        row.author,
        row.totalBorrowed,
        row.lostCopies,
      ]),
    },
  ];
}

function buildAttendanceReportSheets(
  reportData: ReturnType<typeof buildAttendanceReport>
): XlsxSheet[] {
  return [
    {
      name: "Absensi Siswa",
      columns: ["Nama", "Tanggal", "Waktu", "Tujuan"],
      rows: reportData.students.map((row) => [
        row.name,
        row.date,
        row.time,
        row.purpose,
      ]),
    },
    {
      name: "Absensi Umum",
      columns: ["Nama", "Tanggal", "Waktu", "Tujuan"],
      rows: reportData.publicVisitors.map((row) => [
        row.name,
        row.date,
        row.time,
        row.purpose,
      ]),
    },
  ];
}
