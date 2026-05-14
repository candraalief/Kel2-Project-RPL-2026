import { requireRole } from "@/modules/access/lib/guards";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
import {
  getAttendanceRecords,
  getDetailedTransactions,
} from "@/modules/library/lib/data";
import { createPdfReport } from "@/modules/library/lib/pdf";
import {
  buildAttendanceReport,
  buildCollectionReport,
  buildTransactionReport,
  getDefaultReportMonth,
  getDefaultReportYear,
  getReportPeriodRange,
  getTodayDateKey,
  normalizeReportMonth,
  normalizeReportYear,
  type AttendanceReportTab,
  type CollectionReportData,
  type CollectionReportPeriod,
  type CollectionReportTab,
  type ReportFilters,
  type ReportFormat,
  type ReportType,
  type TransactionReportData,
  type TransactionReportTab,
} from "@/modules/library/lib/reports";
import { createXlsxWorkbook, type XlsxSheet } from "@/modules/library/lib/xlsx";

export const runtime = "nodejs";

function parseReportType(value: string | null): ReportType {
  if (value === "absensi" || value === "koleksi") {
    return value;
  }

  return "transaksi";
}

function parseReportFormat(value: string | null): ReportFormat {
  return value === "pdf" ? "pdf" : "excel";
}

function parseTransactionTab(value: string | null): TransactionReportTab {
  if (value === "siswa") {
    return value;
  }

  return "transaksi";
}

function parseCollectionTab(value: string | null): CollectionReportTab {
  return value === "populer" ? "populer" : "inventaris";
}

function parseCollectionPeriod(value: string | null): CollectionReportPeriod {
  if (value === "yearly" || value === "all") {
    return value;
  }

  return "monthly";
}

function parseAttendanceTab(value: string | null): AttendanceReportTab {
  return value === "umum" ? "umum" : "siswa";
}

function getReportFilters(searchParams: URLSearchParams): ReportFilters {
  const today = getTodayDateKey();
  const defaultMonth = getDefaultReportMonth(today);
  const defaultYear = getDefaultReportYear(today);
  const collectionPeriod = parseCollectionPeriod(
    searchParams.get("periode") ?? searchParams.get("periode_koleksi")
  );
  const collectionMonth = normalizeReportMonth(
    searchParams.get("bulan") ?? searchParams.get("bulan_koleksi") ?? "",
    defaultMonth
  );
  const collectionYear = normalizeReportYear(
    searchParams.get("tahun") ?? searchParams.get("tahun_koleksi") ?? "",
    defaultYear
  );
  const periodRange = getReportPeriodRange({
    collectionPeriod,
    collectionMonth,
    collectionYear,
  });

  return {
    type: parseReportType(searchParams.get("jenis")),
    format: parseReportFormat(searchParams.get("format")),
    startDate: periodRange.startDate,
    endDate: periodRange.endDate,
    tab: parseTransactionTab(searchParams.get("tab")),
    collectionTab: parseCollectionTab(searchParams.get("tab")),
    collectionPeriod,
    collectionMonth,
    collectionYear,
    attendanceTab: parseAttendanceTab(searchParams.get("tab")),
  };
}

export async function GET(request: Request) {
  await requireRole("admin");

  const url = new URL(request.url);
  const filters = getReportFilters(url.searchParams);
  const payload = await buildDownloadPayload(filters);
  const body =
    filters.format === "pdf"
      ? createPdfReport({
          title: payload.title,
          subtitle: payload.subtitle,
          sheets: payload.sheets,
        })
      : createXlsxWorkbook(payload.sheets);
  const extension = filters.format === "pdf" ? "pdf" : "xlsx";
  const contentType =
    filters.format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new Response(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${payload.filenameBase}.${extension}"`,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

async function buildDownloadPayload(filters: ReportFilters) {
  if (filters.type === "absensi") {
    const attendance = await getAttendanceRecords({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    const reportData = buildAttendanceReport(attendance, filters);

    return {
      title: "Laporan Absensi Perpustakaan",
      subtitle: `Periode ${reportData.periodLabel}`,
      filenameBase: `laporan-absensi-${getReportPeriodSlug(filters)}`,
      sheets: buildAttendanceReportSheets(reportData),
    };
  }

  if (filters.type === "koleksi") {
    const [catalogData, transactions] = await Promise.all([
      getAdminCatalogData(),
      getDetailedTransactions(),
    ]);
    const reportData = buildCollectionReport(
      catalogData.books,
      transactions,
      filters
    );
    return {
      title: "Laporan Koleksi Buku",
      subtitle: `Periode popularitas ${reportData.periodLabel}`,
      filenameBase: `laporan-koleksi-${getReportPeriodSlug(filters)}`,
      sheets: buildCollectionReportSheets(reportData),
    };
  }

  const transactions = await getDetailedTransactions();
  const reportData = buildTransactionReport(transactions, filters);

  return {
    title: "Laporan Peminjaman Buku",
    subtitle: `Periode ${reportData.periodLabel}`,
    filenameBase: `laporan-peminjaman-${getReportPeriodSlug(filters)}`,
    sheets: buildBorrowingReportSheets(reportData),
  };
}

function getReportPeriodSlug(filters: ReportFilters) {
  if (filters.collectionPeriod === "all") {
    return "sepanjang-waktu";
  }

  if (filters.collectionPeriod === "yearly") {
    return filters.collectionYear;
  }

  return filters.collectionMonth;
}

function buildBorrowingReportSheets(reportData: TransactionReportData): XlsxSheet[] {
  return [
    {
      name: "Semua Peminjaman",
      columns: [
        "ID Transaksi",
        "Nama Siswa",
        "Kelas",
        "Judul Buku",
        "Tanggal Pinjam",
        "Tanggal Jatuh Tempo",
        "Tanggal Kembali",
        "Status",
      ],
      rows: reportData.transactions.map((row) => [
        row.id,
        row.studentName,
        row.className,
        row.bookTitle,
        row.borrowedAt,
        row.dueAt,
        row.returnedAt,
        row.statusLabel,
      ]),
    },
    {
      name: "Rekap Per Siswa",
      columns: [
        "Nama Siswa",
        "Kelas",
        "Total Transaksi",
        "Sedang Dipinjam",
        "Dikembalikan Tepat Waktu",
        "Terlambat",
      ],
      rows: reportData.students.map((row) => [
        row.studentName,
        row.className,
        row.totalTransactions,
        row.activeTransactions,
        row.returnedOnTimeTransactions,
        row.lateTransactions,
      ]),
    },
  ];
}

function buildCollectionReportSheets(reportData: CollectionReportData): XlsxSheet[] {
  return [
    {
      name: "Inventaris Buku",
      columns: [
        "Judul Buku",
        "Penulis",
        "Total Eksemplar Aktif",
        "Total Eksemplar Dikeluarkan",
      ],
      rows: reportData.inventory.map((row) => [
        row.title,
        row.author,
        row.activeCopies,
        row.removedCopies,
      ]),
    },
    {
      name: "Buku Terpopuler",
      columns: ["Ranking", "Judul Buku", "Penulis", "Total Dipinjam"],
      rows: reportData.popular.map((row) => [
        row.rank,
        row.title,
        row.author,
        row.totalBorrowed,
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
      columns: ["Nama", "Kelas Saat Absen", "Tujuan Kunjungan", "Waktu"],
      rows: reportData.students.map((row) => [
        row.name,
        row.className,
        row.purpose,
        row.visitedAt,
      ]),
    },
    {
      name: "Absensi Umum",
      columns: ["Nama", "Instansi Asal", "Tujuan Kunjungan", "Waktu"],
      rows: reportData.publicVisitors.map((row) => [
        row.name,
        row.institution,
        row.purpose,
        row.visitedAt,
      ]),
    },
  ];
}
