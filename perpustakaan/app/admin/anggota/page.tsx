import {
  defaultSiswaAccountLimit,
  getSiswaAccountPage,
  siswaAccountLimitOptions,
  type SiswaAccountFilters,
  type SiswaAccountSortDirection,
  type SiswaAccountSortKey,
  type SiswaAccountStatusFilter,
  type SiswaAccountTab,
} from "@/modules/access/lib/student-registration";
import { requireRole } from "@/modules/access/lib/guards";
import { AdminMembers } from "@/modules/access/ui/admin-members";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";

type AdminMembersPageProps = {
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

function parseTab(value: string): SiswaAccountTab {
  return value === "pending" ? "pending" : "registered";
}

function parseLimit(value: string) {
  const limit = Number(value);

  if (siswaAccountLimitOptions.includes(limit as (typeof siswaAccountLimitOptions)[number])) {
    return limit;
  }

  return defaultSiswaAccountLimit;
}

function parsePage(value: string) {
  const page = Number(value);

  if (Number.isInteger(page) && page > 0) {
    return page;
  }

  return 1;
}

function parseStatus(value: string, tab: SiswaAccountTab): SiswaAccountStatusFilter {
  if (tab === "pending") {
    return null;
  }

  return value === "aktif" || value === "nonaktif" ? value : null;
}

function parseSort(value: string): SiswaAccountSortKey | null {
  return value === "nisn" || value === "nama" || value === "kelas"
    ? value
    : null;
}

function parseDirection(value: string): SiswaAccountSortDirection {
  return value === "desc" ? "desc" : "asc";
}

function getSiswaFilters(
  searchParams: Record<string, string | string[] | undefined>
): SiswaAccountFilters {
  const tab = parseTab(readSearchParam(searchParams, "tab"));

  return {
    tab,
    search: readSearchParam(searchParams, "q"),
    status: parseStatus(readSearchParam(searchParams, "status"), tab),
    sort: parseSort(readSearchParam(searchParams, "sort")),
    direction: parseDirection(readSearchParam(searchParams, "dir")),
    limit: parseLimit(readSearchParam(searchParams, "limit")),
    page: parsePage(readSearchParam(searchParams, "page")),
  };
}

export default async function AdminMembersPage({
  searchParams,
}: AdminMembersPageProps) {
  const user = await requireRole("admin");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = getSiswaFilters(resolvedSearchParams);
  const siswaPage = await getSiswaAccountPage(filters);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Anggota"
      description="Kelola data siswa terdaftar dan verifikasi pendaftaran baru untuk sistem perpustakaan"
      activeNav="Anggota"
    >
      <AdminMembers siswaPage={siswaPage} filters={filters} />
    </DashboardShell>
  );
}
