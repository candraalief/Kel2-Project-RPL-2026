import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
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
  if (value === "absensi") {
    return value;
  }

  return "transaksi";
}

function parseReportFormat(value: string): ReportFormat {
  return value === "pdf" ? "pdf" : "excel";
}

function parseTransactionTab(value: string): TransactionReportTab {
  if (value === "siswa" || value === "buku") {
    return value;
  }

  return "transaksi";
}

function parseAttendanceTab(value: string): AttendanceReportTab {
  return value === "umum" ? "umum" : "siswa";
}

function getReportFilters(
  searchParams: Record<string, string | string[] | undefined>
): ReportFilters {
  const today = getTodayDateKey();
  const defaultStartDate = getDefaultReportStartDate(today);
  let startDate = normalizeReportDate(
    readSearchParam(searchParams, "mulai"),
    defaultStartDate
  );
  let endDate = normalizeReportDate(readSearchParam(searchParams, "sampai"), today);

  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }

  return {
    type: parseReportType(readSearchParam(searchParams, "jenis")),
    format: parseReportFormat(readSearchParam(searchParams, "format")),
    startDate,
    endDate,
    tab: parseTransactionTab(readSearchParam(searchParams, "tab")),
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
