import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import {
  getAttendanceRecords,
  getDetailedTransactions,
} from "@/modules/library/lib/data";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
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
  type CollectionReportPeriod,
  type CollectionReportTab,
  type ReportFilters,
  type ReportFormat,
  type ReportType,
  type TransactionReportTab,
} from "@/modules/library/lib/reports";
import { AdminReports } from "@/modules/library/ui/admin-reports";

type AdminReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseReportType(value: string): ReportType {
  if (value === "absensi" || value === "koleksi") {
    return value;
  }

  return "transaksi";
}

function parseReportFormat(value: string): ReportFormat {
  return value === "pdf" ? "pdf" : "excel";
}

function parseTransactionTab(value: string): TransactionReportTab {
  if (value === "siswa") {
    return value;
  }

  return "transaksi";
}

function parseCollectionTab(value: string): CollectionReportTab {
  return value === "populer" ? "populer" : "inventaris";
}

function parseCollectionPeriod(value: string): CollectionReportPeriod {
  if (value === "yearly" || value === "all") {
    return value;
  }

  return "monthly";
}

function parseAttendanceTab(value: string): AttendanceReportTab {
  return value === "umum" ? "umum" : "siswa";
}

function getReportFilters(
  searchParams: Record<string, string | string[] | undefined>
): ReportFilters {
  const today = getTodayDateKey();
  const defaultMonth = getDefaultReportMonth(today);
  const defaultYear = getDefaultReportYear(today);
  const collectionPeriod = parseCollectionPeriod(
    readSearchParam(searchParams, "periode") ||
      readSearchParam(searchParams, "periode_koleksi")
  );
  const collectionMonth = normalizeReportMonth(
    readSearchParam(searchParams, "bulan") ||
      readSearchParam(searchParams, "bulan_koleksi"),
    defaultMonth
  );
  const collectionYear = normalizeReportYear(
    readSearchParam(searchParams, "tahun") ||
      readSearchParam(searchParams, "tahun_koleksi"),
    defaultYear
  );
  const periodRange = getReportPeriodRange({
    collectionPeriod,
    collectionMonth,
    collectionYear,
  });

  return {
    type: parseReportType(readSearchParam(searchParams, "jenis")),
    format: parseReportFormat(readSearchParam(searchParams, "format")),
    startDate: periodRange.startDate,
    endDate: periodRange.endDate,
    tab: parseTransactionTab(readSearchParam(searchParams, "tab")),
    collectionTab: parseCollectionTab(readSearchParam(searchParams, "tab")),
    collectionPeriod,
    collectionMonth,
    collectionYear,
    attendanceTab: parseAttendanceTab(readSearchParam(searchParams, "tab")),
  };
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const user = await requireRole("admin");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = getReportFilters(resolvedSearchParams);
  const confirmDownload = readSearchParam(resolvedSearchParams, "unduh") === "1";
  const transactionReportData =
    filters.type === "transaksi" ? await buildTransactionReports(filters) : null;
  const collectionReportData =
    filters.type === "koleksi" ? await buildCollectionReports(filters) : null;
  const attendanceReportData =
    filters.type === "absensi" ? await buildAttendanceReports(filters) : null;

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Laporan"
      description="Susun laporan peminjaman perpustakaan berdasarkan periode dan format dokumen."
      activeNav="Laporan"
    >
      <AdminReports
        filters={filters}
        transactionReportData={transactionReportData}
        collectionReportData={collectionReportData}
        attendanceReportData={attendanceReportData}
        confirmDownload={confirmDownload}
      />
    </DashboardShell>
  );
}

async function buildTransactionReports(filters: ReportFilters) {
  const transactions = await getDetailedTransactions();

  return buildTransactionReport(transactions, filters);
}

async function buildAttendanceReports(filters: ReportFilters) {
  const attendance = await getAttendanceRecords({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  return buildAttendanceReport(attendance, filters);
}

async function buildCollectionReports(filters: ReportFilters) {
  const [catalogData, transactions] = await Promise.all([
    getAdminCatalogData(),
    getDetailedTransactions(),
  ]);

  return buildCollectionReport(catalogData.books, transactions, filters);
}
