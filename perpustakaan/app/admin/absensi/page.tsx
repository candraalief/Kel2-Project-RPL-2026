import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import {
  getAttendanceRecordPage,
  getStudentNameSuggestions,
  type AttendanceRecordFilters,
} from "@/modules/library/lib/data";
import { AdminAttendanceContent } from "./admin-attendance-content";

const attendanceLimitOptions = [10, 25, 50, 100, 250] as const;
const defaultAttendanceLimit = 25;

type AdminAttendancePageProps = {
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

function parseAttendanceLimit(value: string) {
  const limit = Number(value);

  if (attendanceLimitOptions.includes(limit as (typeof attendanceLimitOptions)[number])) {
    return limit;
  }

  return defaultAttendanceLimit;
}

function parseAttendancePage(value: string) {
  const page = Number(value);

  if (Number.isInteger(page) && page > 0) {
    return page;
  }

  return 1;
}

function getAttendanceFilters(
  searchParams: Record<string, string | string[] | undefined>
): AttendanceRecordFilters {
  const visitorType = readSearchParam(searchParams, "jenis");

  return {
    search: readSearchParam(searchParams, "q"),
    visitorType: visitorType === "siswa" || visitorType === "umum" ? visitorType : "",
    startDate: readSearchParam(searchParams, "mulai"),
    endDate: readSearchParam(searchParams, "sampai"),
    limit: parseAttendanceLimit(readSearchParam(searchParams, "limit")),
    page: parseAttendancePage(readSearchParam(searchParams, "page")),
  };
}

export default async function AdminAttendancePage({
  searchParams,
}: AdminAttendancePageProps) {
  const user = await requireRole("admin");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = getAttendanceFilters(resolvedSearchParams);
  const [attendancePage, studentNameSuggestions] = await Promise.all([
    getAttendanceRecordPage(filters),
    getStudentNameSuggestions(),
  ]);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Absensi"
      description="Pantau seluruh absensi pengunjung umum maupun siswa di perpustakaan."
      activeNav="Absensi"
    >
      <AdminAttendanceContent
        attendancePage={attendancePage}
        filters={filters}
        studentNameSuggestions={studentNameSuggestions}
      />
    </DashboardShell>
  );
}
