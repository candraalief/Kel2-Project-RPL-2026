"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AttendanceRecordFilters,
  AttendanceRecordPage,
  StudentSuggestion,
} from "@/modules/library/lib/data";
import { PublicAttendanceForm } from "@/modules/library/ui/attendance-forms";
import { AttendanceTable } from "@/modules/library/ui/library-cards";

const attendanceLimitOptions = [5, 10, 25, 50, 100, 250] as const;
const defaultAttendanceLimit = 5;

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const appliedFilterFormState = toFilterFormState(filters);
  const filterFormKey = JSON.stringify(appliedFilterFormState);

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddModalOpen]);

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
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Riwayat absensi
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
                Daftar kunjungan perpustakaan
              </h3>
            </div>
            <p className="text-sm text-zinc-500">
              Menampilkan {firstItem}-{lastItem} dari {attendancePage.total} data,
              maksimal {attendancePage.limit} per halaman.
            </p>
          </div>

          <AttendanceFilterForm
            key={filterFormKey}
            filters={filters}
            onAddAttendance={() => setIsAddModalOpen(true)}
          />

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <AttendanceTable records={attendancePage.records} scrollable />
          </div>

          {attendancePage.totalPages > 1 ? (
            <nav
              aria-label="Pagination riwayat absensi"
              className="flex flex-wrap items-center gap-2"
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
        </div>
      </section>

      {isAddModalOpen ? (
        <AttendanceModal onClose={() => setIsAddModalOpen(false)}>
          <PublicAttendanceForm studentNameSuggestions={studentNameSuggestions} />
        </AttendanceModal>
      ) : null}
    </div>
  );
}

function AttendanceFilterForm({
  filters,
  onAddAttendance,
}: {
  filters: AttendanceRecordFilters;
  onAddAttendance: () => void;
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
      className="space-y-4"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <FilterField label="Cari riwayat absensi">
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

        <button
          type="button"
          onClick={onAddAttendance}
          className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2]"
        >
          Tambah absensi
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.95fr_0.95fr_0.75fr_0.75fr_auto_auto] lg:items-end">
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
      </div>
    </form>
  );
}

function AttendanceModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tambah absensi"
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-gradient-to-r from-[#f8fbff] to-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1d66d6]">
              Tambah absensi
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-zinc-950">
              Modal card pencatatan kunjungan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Tutup modal"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-84px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
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
