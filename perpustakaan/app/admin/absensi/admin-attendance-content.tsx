"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AttendanceRecordFilters,
  AttendanceRecordPage,
  StudentSuggestion,
} from "@/modules/library/lib/data";
import { PublicAttendanceForm } from "@/modules/library/ui/attendance-forms";
import { CollapsibleSectionCard } from "@/modules/library/ui/collapsible-section-card";
import { AttendanceTable } from "@/modules/library/ui/library-cards";

const attendanceLimitOptions = [10, 25, 50, 100, 250] as const;
const defaultAttendanceLimit = 25;

type FilterFormState = {
  search: string;
  visitorType: "" | "siswa" | "umum";
  startDate: string;
  endDate: string;
  limit: string;
};

function toFilterFormState(filters: AttendanceRecordFilters): FilterFormState {
  return {
    search: filters.search ?? "",
    visitorType: filters.visitorType ?? "",
    startDate: filters.startDate ?? "",
    endDate: filters.endDate ?? "",
    limit: String(filters.limit ?? defaultAttendanceLimit),
  };
}

function buildAttendancePageHref(
  filters: FilterFormState,
  page: number,
  reset = false
) {
  const params = new URLSearchParams();

  if (!reset && filters.search.trim()) {
    params.set("q", filters.search.trim());
  }

  if (!reset && filters.visitorType) {
    params.set("jenis", filters.visitorType);
  }

  if (!reset && filters.startDate) {
    params.set("mulai", filters.startDate);
  }

  if (!reset && filters.endDate) {
    params.set("sampai", filters.endDate);
  }

  params.set("limit", reset ? String(defaultAttendanceLimit) : filters.limit);

  if (!reset && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/admin/absensi?${query}` : "/admin/absensi";
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ] as const;
}

export function AdminAttendanceContent({
  attendancePage,
  filters,
  studentNameSuggestions,
}: {
  attendancePage: AttendanceRecordPage;
  filters: AttendanceRecordFilters;
  studentNameSuggestions: StudentSuggestion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const appliedFilterFormState = toFilterFormState(filters);
  const filterFormKey = JSON.stringify(appliedFilterFormState);

  function navigateWithFilters(nextPage: number, reset = false) {
    startTransition(() => {
      router.replace(
        buildAttendancePageHref(appliedFilterFormState, nextPage, reset),
        {
          scroll: false,
        }
      );
    });
  }

  const firstItem =
    attendancePage.total === 0
      ? 0
      : (attendancePage.currentPage - 1) * attendancePage.limit + 1;
  const lastItem =
    attendancePage.total === 0
      ? 0
      : firstItem + attendancePage.records.length - 1;
  const paginationItems = getPaginationItems(
    attendancePage.currentPage,
    attendancePage.totalPages
  );

  return (
    <div className="space-y-5">
      <CollapsibleSectionCard title="Absensi" subtitle="Isi Data Kunjungan">
        <PublicAttendanceForm studentNameSuggestions={studentNameSuggestions} />
      </CollapsibleSectionCard>

      <CollapsibleSectionCard
        title="Riwayat absensi"
        subtitle="Daftar kunjungan perpustakaan"
      >
        <AttendanceFilterForm
          key={filterFormKey}
          filters={filters}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
          <p>
            Menampilkan {firstItem}-{lastItem} dari {attendancePage.total} data,
            maksimal {attendancePage.limit} per halaman.
          </p>
        </div>

        <div className="mt-3">
          <AttendanceTable records={attendancePage.records} scrollable />
        </div>

        {attendancePage.totalPages > 1 ? (
          <nav
            aria-label="Pagination riwayat absensi"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            {paginationItems.map((item, index) => {
              if (item === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm text-zinc-400"
                  >
                    ...
                  </span>
                );
              }

              const isActive = item === attendancePage.currentPage;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => navigateWithFilters(item)}
                  disabled={isPending && isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#1d66d6] bg-[#1d66d6] text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </nav>
        ) : null}
      </CollapsibleSectionCard>
    </div>
  );
}

function AttendanceFilterForm({
  filters,
}: {
  filters: AttendanceRecordFilters;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterFormState, setFilterFormState] = useState<FilterFormState>(() =>
    toFilterFormState(filters)
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => {
          router.replace(buildAttendancePageHref(filterFormState, 1), {
            scroll: false,
          });
        });
      }}
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1.1fr_0.7fr_0.75fr_0.75fr_0.65fr_auto_auto] md:items-end"
    >
      <FilterField label="Nama pengunjung">
        <input
          name="q"
          value={filterFormState.search}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFilterFormState((current) => ({
              ...current,
              search: value,
            }));
          }}
          placeholder="Cari nama"
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
        />
      </FilterField>

      <FilterField label="Jenis">
        <select
          name="jenis"
          value={filterFormState.visitorType}
          onChange={(event) => {
            const value = event.currentTarget.value as FilterFormState["visitorType"];
            setFilterFormState((current) => ({
              ...current,
              visitorType: value,
            }));
          }}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
        >
          <option value="">Semua</option>
          <option value="siswa">Siswa</option>
          <option value="umum">Umum</option>
        </select>
      </FilterField>

      <FilterField label="Dari tanggal">
        <input
          type="date"
          name="mulai"
          value={filterFormState.startDate}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFilterFormState((current) => ({
              ...current,
              startDate: value,
            }));
          }}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
        />
      </FilterField>

      <FilterField label="Sampai tanggal">
        <input
          type="date"
          name="sampai"
          value={filterFormState.endDate}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFilterFormState((current) => ({
              ...current,
              endDate: value,
            }));
          }}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
        />
      </FilterField>

      <FilterField label="Maks data">
        <select
          name="limit"
          value={filterFormState.limit}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFilterFormState((current) => ({
              ...current,
              limit: value,
            }));
          }}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
        >
          {attendanceLimitOptions.map((limit) => (
            <option key={limit} value={limit}>
              {limit}
            </option>
          ))}
        </select>
      </FilterField>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Memuat..." : "Filter"}
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setFilterFormState(toFilterFormState({ limit: defaultAttendanceLimit }));
          startTransition(() => {
            router.replace("/admin/absensi", { scroll: false });
          });
        }}
        className="inline-flex h-[42px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
      >
        Reset
      </button>
    </form>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
