"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import {
  approveSiswaRegistration,
  clearSiswaPassword,
  createSiswaByAdmin,
  deactivateSiswaByAdmin,
  deleteSiswaByAdmin,
  rejectSiswaRegistration,
  updateSiswaByAdmin,
  type SiswaAdminActionState,
} from "@/app/actions/auth";
import {
  siswaAccountLimitOptions,
  type SiswaAccount,
  type SiswaAccountFilters,
  type SiswaAccountPage,
  type SiswaAccountStatusFilter,
} from "@/modules/access/lib/student-registration";
import {
  ButtonLoadingSpinner,
  useButtonPressLoading,
} from "@/modules/shared/ui/button-loading";

type ActiveTab = "registered" | "pending";
type ModalMode = "add" | "detail" | "edit";
type SortKey = "nisn" | "nama" | "kelas";
type SortDirection = "asc" | "desc";
type StatusFilter = SiswaAccountStatusFilter;
type MemberModal =
  | { mode: "add"; siswa?: never }
  | { mode: "detail" | "edit"; siswa: SiswaAccount };

const initialActionState: SiswaAdminActionState = {
  error: "",
  success: "",
};

function isPending(siswa: SiswaAccount) {
  return siswa.status_keanggotaan === "menunggu_verifikasi";
}

function statusLabel(status: string | null) {
  if (status === "aktif") {
    return "Aktif";
  }

  if (status === "nonaktif") {
    return "Non-Aktif";
  }

  if (status === "menunggu_verifikasi") {
    return "Menunggu";
  }

  return status || "-";
}

function StatusBadge({ status }: { status: string | null }) {
  const tone =
    status === "aktif"
      ? "bg-[#020016] text-white"
      : "bg-[#eef0f4] text-[#020016]";

  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "search" | "plus" | "eye" | "edit" | "trash" | "check" | "x" | "chevron";
  className?: string;
}) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 15.5V18h2.5L18.8 7.7a1.8 1.8 0 000-2.5 1.8 1.8 0 00-2.5 0L6 15.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 12.5l4 4L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AdminMembers({
  siswaPage,
  filters,
}: {
  siswaPage: SiswaAccountPage;
  filters: SiswaAccountFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = filters.tab;
  const statusFilter = filters.status;
  const sortConfig = filters.sort
    ? { key: filters.sort, direction: filters.direction }
    : null;
  const [search, setSearch] = useState(filters.search);
  const [modal, setModal] = useState<MemberModal | null>(null);
  const [resetSiswa, setResetSiswa] = useState<SiswaAccount | null>(null);
  const [deleteSiswa, setDeleteSiswa] = useState<SiswaAccount | null>(null);
  const [approveSiswa, setApproveSiswa] = useState<SiswaAccount | null>(null);
  const [rejectSiswa, setRejectSiswa] = useState<SiswaAccount | null>(null);
  const [resetNotice, setResetNotice] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");
  const [approveNotice, setApproveNotice] = useState(false);
  const [rejectNotice, setRejectNotice] = useState(false);
  const [updatedSiswa, setUpdatedSiswa] = useState<Record<number, SiswaAccount>>({});
  const [resetPasswordIds, setResetPasswordIds] = useState<Set<number>>(
    () => new Set()
  );
  const {
    loadingKey: loadingTab,
    startLoading: startTabLoading,
    clearLoading: clearTabLoading,
  } = useButtonPressLoading<ActiveTab>(4000);

  const updateQuery = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
          return;
        }

        params.set(key, String(value));
      });

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== filters.search) {
        updateQuery({ q: search.trim(), page: 1 });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [filters.search, search, updateQuery]);

  useEffect(() => {
    if (!resetNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setResetNotice(false);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [resetNotice]);

  useEffect(() => {
    if (!deleteNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDeleteNotice("");
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [deleteNotice]);

  useEffect(() => {
    if (!approveNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setApproveNotice(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [approveNotice]);

  useEffect(() => {
    if (!rejectNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRejectNotice(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [rejectNotice]);

  useEffect(() => {
    clearTabLoading();
  }, [activeTab, clearTabLoading]);

  const filteredSiswa = siswaPage.siswa.map(
    (item) => updatedSiswa[item.id_siswa] ?? item
  );
  const registeredSiswaCount = siswaPage.registeredTotal;
  const pendingSiswaCount = siswaPage.pendingTotal;

  function toggleSort(key: SortKey) {
    if (!sortConfig || sortConfig.key !== key) {
      updateQuery({ sort: key, dir: "asc", page: 1 });
      return;
    }

    if (sortConfig.direction === "asc") {
      updateQuery({ sort: key, dir: "desc", page: 1 });
      return;
    }

    updateQuery({ sort: null, dir: null, page: 1 });
  }

  function toggleStatusFilter() {
    if (activeTab === "pending") {
      return;
    }

    if (statusFilter === null) {
      updateQuery({ status: "aktif", page: 1 });
      return;
    }

    if (statusFilter === "aktif") {
      updateQuery({ status: "nonaktif", page: 1 });
      return;
    }

    updateQuery({ status: null, page: 1 });
  }

  function resetFilters() {
    setSearch("");
    updateQuery({ q: null, status: null, sort: null, dir: null, page: 1 });
  }

  function changeTab(tab: ActiveTab) {
    if (tab !== activeTab) {
      startTabLoading(tab);
    }

    updateQuery({ tab: tab === "registered" ? null : tab, status: null, page: 1 });
  }

  function changeLimit(limit: number) {
    updateQuery({ limit: limit === 5 ? null : limit, page: 1 });
  }

  function changePage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), siswaPage.pageCount);
    updateQuery({ page: nextPage === 1 ? null : nextPage });
  }

  function isResetPasswordDisabled(item: SiswaAccount) {
    return (
      isPending(item) ||
      !item.password_tersedia ||
      resetPasswordIds.has(item.id_siswa)
    );
  }

  function resetPasswordTitle(item: SiswaAccount) {
    if (isPending(item)) {
      return "Reset password aktif setelah akun diverifikasi";
    }

    if (!item.password_tersedia || resetPasswordIds.has(item.id_siswa)) {
      return "Password sudah direset";
    }

    return "Reset password";
  }

  function handleSiswaUpdated(siswa: SiswaAccount) {
    setUpdatedSiswa((currentSiswa) => ({
      ...currentSiswa,
      [siswa.id_siswa]: siswa,
    }));
    setModal((currentModal) =>
      currentModal &&
      currentModal.mode !== "add" &&
      currentModal.siswa.id_siswa === siswa.id_siswa
        ? { ...currentModal, siswa }
        : currentModal
    );
  }

  const firstVisibleItem =
    siswaPage.total === 0 ? 0 : (siswaPage.page - 1) * siswaPage.limit + 1;
  const lastVisibleItem = Math.min(
    siswaPage.page * siswaPage.limit,
    siswaPage.total
  );

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="shrink-0 space-y-4 border-b border-zinc-200 px-4 py-5 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="grid min-h-12 w-full grid-cols-2 rounded-2xl bg-[#e8e8ed] p-1 lg:flex-1">
            <button
              type="button"
              onClick={() => changeTab("registered")}
              aria-busy={loadingTab === "registered"}
              className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold transition ${
                activeTab === "registered" || loadingTab === "registered"
                  ? "bg-white text-black shadow-sm"
                  : "text-black"
              }`}
            >
              {loadingTab === "registered" ? <ButtonLoadingSpinner /> : null}
              <span className="truncate">Siswa Terdaftar ({registeredSiswaCount})</span>
            </button>
            <button
              type="button"
              onClick={() => changeTab("pending")}
              aria-busy={loadingTab === "pending"}
              className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold transition ${
                activeTab === "pending" || loadingTab === "pending"
                  ? "bg-white text-black shadow-sm"
                  : "text-black"
              }`}
            >
              {loadingTab === "pending" ? <ButtonLoadingSpinner /> : null}
              <span className="truncate">Menunggu Verifikasi ({pendingSiswaCount})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModal({ mode: "add" })}
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-3 rounded-lg bg-[#020016] px-5 text-sm font-semibold text-white transition hover:bg-[#10102a] lg:w-auto"
          >
            <Icon name="plus" className="h-5 w-5" />
            Tambah Siswa
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative block w-full lg:flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" className="h-6 w-6" />
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Cari berdasarkan nama, NIS, atau nomor telepon..."
              className="h-12 w-full rounded-lg border border-transparent bg-[#f1f1f4] pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#020016]"
            />
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-50 lg:w-auto"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-7">
        <div className="min-w-0">
          <div className="overflow-x-auto pb-2">
          <table className="min-w-[760px] w-full table-fixed border-collapse text-center">
            <thead>
              <tr className="border-b border-zinc-200 text-sm font-semibold text-black">
                <th className="w-[12%] px-2 py-2.5">
                  <SortHeader
                    label="NIS"
                    numeric
                    active={sortConfig?.key === "nisn" ? sortConfig.direction : null}
                    onClick={() => toggleSort("nisn")}
                  />
                </th>
                <th className="w-[20%] px-2 py-2.5">
                  <SortHeader
                    label="Nama"
                    active={sortConfig?.key === "nama" ? sortConfig.direction : null}
                    onClick={() => toggleSort("nama")}
                  />
                </th>
                <th className="w-[18%] px-2 py-2.5">
                  <PlainHeader label="Nomor Telepon" />
                </th>
                <th className="w-[19%] px-2 py-2.5">
                  <StatusHeader
                    label={activeTab === "registered" ? "Status Keanggotaan" : "Status"}
                    active={statusFilter}
                    onClick={toggleStatusFilter}
                  />
                </th>
                <th className="w-[16%] px-2 py-2.5">
                  <PlainHeader label="Reset Password" />
                </th>
                <th className="w-[15%] px-2 py-2.5">
                  <PlainHeader label="Aksi" />
                </th>
              </tr>
            </thead>
          </table>

          <div className="max-h-[310px] overflow-y-auto">
          <table className="min-w-[760px] w-full table-fixed border-collapse text-center">
            <tbody>
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-500">
                    Tidak ada data siswa yang cocok.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((item) => (
                  <tr key={item.id_siswa} className="border-b border-zinc-200 text-sm text-black last:border-b-0">
                    <td className="w-[12%] px-2 py-4">{item.nisn ?? "-"}</td>
                    <td className="w-[20%] truncate px-2 py-4" title={item.nama}>
                      {item.nama}
                    </td>
                    <td className="w-[18%] px-2 py-4">{item.nomor_whatsapp ?? "-"}</td>
                    <td className="w-[19%] px-2 py-4">
                      <StatusBadge status={item.status_keanggotaan} />
                    </td>
                    <td className="w-[16%] px-2 py-4">
                      <button
                        type="button"
                        disabled={isResetPasswordDisabled(item)}
                        onClick={() => setResetSiswa(item)}
                        title={resetPasswordTitle(item)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:hover:bg-zinc-50"
                      >
                        Reset
                      </button>
                    </td>
                    <td className="w-[15%] px-2 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "detail", siswa: item })}
                          className="text-black transition hover:text-[#0f5fc4]"
                          title="Lihat detail"
                        >
                          <span className="sr-only">Lihat detail {item.nama}</span>
                          <Icon name="eye" className="h-5 w-5" />
                        </button>

                        {activeTab === "registered" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setModal({ mode: "edit", siswa: item })}
                              className="text-black transition hover:text-[#0f5fc4]"
                              title="Edit siswa"
                            >
                              <span className="sr-only">Edit {item.nama}</span>
                              <Icon name="edit" className="h-5 w-5" />
                            </button>
                            <DeleteSiswaButton
                              siswa={item}
                              onClick={() => setDeleteSiswa(item)}
                            />
                          </>
                        ) : (
                          <>
                            <ApproveSiswaButton
                              siswa={item}
                              onClick={() => setApproveSiswa(item)}
                            />
                            <RejectSiswaButton
                              siswa={item}
                              onClick={() => setRejectSiswa(item)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
            <div>
              Menampilkan {firstVisibleItem}-{lastVisibleItem} dari{" "}
              {siswaPage.total} anggota
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2">
                <span>Baris</span>
                <select
                  value={siswaPage.limit}
                  onChange={(event) => changeLimit(Number(event.target.value))}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-black outline-none transition focus:border-[#020016]"
                >
                  {siswaAccountLimitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(siswaPage.page - 1)}
                  disabled={siswaPage.page <= 1}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                  Sebelumnya
                </button>
                <span className="min-w-24 text-center text-sm font-semibold text-black">
                  {siswaPage.page} / {siswaPage.pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => changePage(siswaPage.page + 1)}
                  disabled={siswaPage.page >= siswaPage.pageCount}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {modal ? (
        <SiswaModal
          modal={modal}
          onClose={() => setModal(null)}
          onUpdated={handleSiswaUpdated}
        />
      ) : null}
      {resetSiswa ? (
        <ResetPasswordModal
          siswa={resetSiswa}
          onClose={() => setResetSiswa(null)}
          onSuccess={() => {
            setResetPasswordIds((currentIds) => {
              const nextIds = new Set(currentIds);
              nextIds.add(resetSiswa.id_siswa);
              return nextIds;
            });
            setResetSiswa(null);
            setResetNotice(true);
          }}
        />
      ) : null}
      {deleteSiswa ? (
        <DeleteSiswaModal
          siswa={deleteSiswa}
          onClose={() => setDeleteSiswa(null)}
          onSuccess={(message) => {
            setDeleteSiswa(null);
            setDeleteNotice(message);
          }}
        />
      ) : null}
      {approveSiswa ? (
        <ApproveSiswaModal
          siswa={approveSiswa}
          onClose={() => setApproveSiswa(null)}
          onSuccess={() => {
            setApproveSiswa(null);
            setApproveNotice(true);
          }}
        />
      ) : null}
      {rejectSiswa ? (
        <RejectSiswaModal
          siswa={rejectSiswa}
          onClose={() => setRejectSiswa(null)}
          onSuccess={() => {
            setRejectSiswa(null);
            setRejectNotice(true);
          }}
        />
      ) : null}
      {resetNotice ? (
        <ActionToast
          message="Reset password berhasil"
          onClose={() => setResetNotice(false)}
        />
      ) : null}
      {deleteNotice ? (
        <ActionToast
          message={deleteNotice}
          onClose={() => setDeleteNotice("")}
        />
      ) : null}
      {approveNotice ? (
        <ActionToast
          message="Pendaftaran siswa berhasil disetujui"
          onClose={() => setApproveNotice(false)}
        />
      ) : null}
      {rejectNotice ? (
        <ActionToast
          message="Pendaftaran siswa berhasil ditolak"
          onClose={() => setRejectNotice(false)}
        />
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  numeric = false,
  active,
  onClick,
}: {
  label: string;
  numeric?: boolean;
  active: SortDirection | null;
  onClick: () => void;
}) {
  const marker =
    active === "asc"
      ? numeric
        ? "0-9"
        : "A-Z"
      : active === "desc"
        ? numeric
          ? "9-0"
          : "Z-A"
        : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full flex-col items-center justify-end rounded-lg px-2 py-1 transition hover:bg-zinc-100"
      title={`Urutkan ${label}`}
    >
      <span className="mb-1 min-h-3 text-[10px] font-semibold leading-3 text-slate-500">
        {marker}
      </span>
      <span>{label}</span>
    </button>
  );
}

function StatusHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: StatusFilter;
  onClick: () => void;
}) {
  const marker =
    active === "aktif" ? "Aktif" : active === "nonaktif" ? "Tidak" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full flex-col items-center justify-end rounded-lg px-2 py-1 transition hover:bg-zinc-100"
      title="Filter status keanggotaan"
    >
      <span className="mb-1 min-h-3 text-[10px] font-semibold leading-3 text-slate-500">
        {marker}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PlainHeader({ label }: { label: string }) {
  return (
    <div className="flex min-h-12 w-full flex-col items-center justify-end px-2 py-1">
      <span className="mb-1 min-h-3 text-[10px] font-semibold leading-3 text-transparent">
        -
      </span>
      <span>{label}</span>
    </div>
  );
}

function ActionToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-4 right-4 top-4 z-[60] flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-lg sm:left-auto sm:right-6 sm:top-6">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-100"
        title="Tutup notifikasi"
      >
        <span className="sr-only">Tutup notifikasi</span>
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

function DangerConfirmModal({
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  tone = "danger",
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  tone?: "danger" | "success";
  error: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmClassName =
    tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-red-600 hover:bg-red-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-black">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Tutup"
          >
            <span className="sr-only">Tutup</span>
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {children}

        {error ? (
          <p className="mt-4 break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-11 w-full min-w-24 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex h-11 w-full min-w-24 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto ${confirmClassName}`}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function ResetPasswordModal({
  siswa,
  onClose,
  onSuccess,
}: {
  siswa: SiswaAccount;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleReset() {
    setError("");
    startTransition(async () => {
      try {
        await clearSiswaPassword(siswa.id_siswa);
        onSuccess();
      } catch (resetError) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : "Gagal mereset password."
        );
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4"
      onClick={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-black">Reset Password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Password akan dikosongkan agar siswa bisa membuat password baru.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            title="Tutup"
          >
            <span className="sr-only">Tutup</span>
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-black">
          <p>
            Nama: <span className="font-semibold">{siswa.nama}</span>
          </p>
          <p className="mt-2">
            Username:{" "}
            <span className="font-semibold">{siswa.username ?? "-"}</span>
          </p>
        </div>

        {error ? (
          <p className="mt-4 break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-11 w-full min-w-20 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-50 sm:w-auto"
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="inline-flex h-11 w-full min-w-20 items-center justify-center rounded-lg bg-[#020016] px-5 text-sm font-semibold text-white transition hover:bg-[#10102a] disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          >
            {isPending ? "Memproses..." : "Ya"}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteSiswaModal({
  siswa,
  onClose,
  onSuccess,
}: {
  siswa: SiswaAccount;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [blockedByTransactions, setBlockedByTransactions] = useState(false);

  function handleDelete() {
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteSiswaByAdmin(siswa.id_siswa);

        if (result.blockedByTransactions) {
          setBlockedByTransactions(true);
          setError("");
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        onSuccess("Anggota berhasil dihapus");
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Gagal menghapus anggota."
        );
      }
    });
  }

  function handleDeactivate() {
    setError("");
    startTransition(async () => {
      try {
        await deactivateSiswaByAdmin(siswa.id_siswa);
        onSuccess("Siswa berhasil dinonaktifkan");
      } catch (deactivateError) {
        setError(
          deactivateError instanceof Error
            ? deactivateError.message
            : "Gagal menonaktifkan siswa."
        );
      }
    });
  }

  return (
    <DangerConfirmModal
      title={blockedByTransactions ? "Nonaktifkan Anggota" : "Hapus Anggota"}
      description={
        blockedByTransactions
          ? "Siswa terikat dengan transaksi dan tidak dapat dihapus. Ubah siswa menjadi nonaktif?"
          : "Data anggota akan dihapus dari sistem perpustakaan."
      }
      confirmLabel={blockedByTransactions ? "Nonaktifkan" : "Hapus"}
      pendingLabel={blockedByTransactions ? "Menonaktifkan..." : "Menghapus..."}
      error={error}
      isPending={isPending}
      onClose={onClose}
      onConfirm={blockedByTransactions ? handleDeactivate : handleDelete}
    >
      <div
        className={`mt-5 rounded-lg border p-4 text-sm text-black ${
          blockedByTransactions
            ? "border-amber-200 bg-amber-50"
            : "border-red-100 bg-red-50"
        }`}
      >
        <p>
          Nama: <span className="font-semibold">{siswa.nama}</span>
        </p>
        <p className="mt-2">
          Username:{" "}
          <span className="font-semibold">{siswa.username ?? "-"}</span>
        </p>
        {blockedByTransactions ? (
          <p className="mt-3 text-amber-800">
            Riwayat transaksi tetap tersimpan, tetapi akun siswa akan berpindah
            ke status Non-Aktif.
          </p>
        ) : null}
      </div>
    </DangerConfirmModal>
  );
}

function ApproveSiswaModal({
  siswa,
  onClose,
  onSuccess,
}: {
  siswa: SiswaAccount;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleApprove() {
    setError("");
    startTransition(async () => {
      try {
        await approveSiswaRegistration(siswa.id_siswa);
        onSuccess();
      } catch (approveError) {
        setError(
          approveError instanceof Error
            ? approveError.message
            : "Gagal menyetujui pendaftaran siswa."
        );
      }
    });
  }

  return (
    <DangerConfirmModal
      title="Setujui Pendaftaran"
      description="Akun siswa akan diaktifkan dan bisa digunakan untuk masuk."
      confirmLabel="Setujui"
      pendingLabel="Menyetujui..."
      tone="success"
      error={error}
      isPending={isPending}
      onClose={onClose}
      onConfirm={handleApprove}
    >
      <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-black">
        <p>
          Nama: <span className="font-semibold">{siswa.nama}</span>
        </p>
        <p className="mt-2">
          Username:{" "}
          <span className="font-semibold">{siswa.username ?? "-"}</span>
        </p>
      </div>
    </DangerConfirmModal>
  );
}

function RejectSiswaModal({
  siswa,
  onClose,
  onSuccess,
}: {
  siswa: SiswaAccount;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleReject() {
    setError("");
    startTransition(async () => {
      try {
        await rejectSiswaRegistration(siswa.id_siswa);
        onSuccess();
      } catch (rejectError) {
        setError(
          rejectError instanceof Error
            ? rejectError.message
            : "Gagal menolak pendaftaran siswa."
        );
      }
    });
  }

  return (
    <DangerConfirmModal
      title="Tolak Pendaftaran"
      description="Data pendaftaran siswa akan dihapus dari database."
      confirmLabel="Tolak"
      pendingLabel="Menolak..."
      error={error}
      isPending={isPending}
      onClose={onClose}
      onConfirm={handleReject}
    >
      <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-black">
        <p>
          Nama: <span className="font-semibold">{siswa.nama}</span>
        </p>
        <p className="mt-2">
          Username:{" "}
          <span className="font-semibold">{siswa.username ?? "-"}</span>
        </p>
      </div>
    </DangerConfirmModal>
  );
}

function ApproveSiswaButton({
  siswa,
  onClick,
}: {
  siswa: SiswaAccount;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-emerald-600 transition hover:text-emerald-700"
      title="Setujui siswa"
    >
      <span className="sr-only">Setujui {siswa.nama}</span>
      <Icon name="check" className="h-5 w-5" />
    </button>
  );
}

function RejectSiswaButton({
  siswa,
  onClick,
}: {
  siswa: SiswaAccount;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-red-500 transition hover:text-red-600"
      title="Tolak siswa"
    >
      <span className="sr-only">Tolak {siswa.nama}</span>
      <Icon name="x" className="h-5 w-5" />
    </button>
  );
}

function DeleteSiswaButton({
  siswa,
  onClick,
}: {
  siswa: SiswaAccount;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-red-500 transition hover:text-red-600"
      title="Hapus siswa"
    >
      <span className="sr-only">Hapus {siswa.nama}</span>
      <Icon name="trash" className="h-5 w-5" />
    </button>
  );
}

function SiswaModal({
  modal,
  onClose,
  onUpdated,
}: {
  modal: MemberModal;
  onClose: () => void;
  onUpdated: (siswa: SiswaAccount) => void;
}) {
  const title =
    modal.mode === "add"
      ? "Tambah Siswa Baru"
      : modal.mode === "edit"
        ? "Edit Data Siswa"
        : "Detail Siswa";
  const subtitle =
    modal.mode === "detail"
      ? "Informasi lengkap dari tabel data siswa"
      : "Tambahkan siswa baru ke sistem perpustakaan";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:py-9"
      onClick={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-4 pt-5 sm:px-7 sm:pt-7">
          <div>
            <h2 className="text-2xl font-semibold text-black">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            title="Tutup"
          >
            <span className="sr-only">Tutup</span>
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {modal.mode === "detail" ? (
          <SiswaDetail siswa={modal.siswa} />
        ) : (
          <SiswaForm
            mode={modal.mode}
            siswa={modal.siswa}
            onClose={onClose}
            onUpdated={onUpdated}
          />
        )}
      </section>
    </div>
  );
}

function SiswaDetail({ siswa }: { siswa: SiswaAccount }) {
  return (
    <div className="grid gap-3 px-4 py-5 sm:grid-cols-2 sm:px-7 sm:py-7">
      <DetailItem label="NIS" value={siswa.nisn} />
      <DetailItem label="Nama Lengkap" value={siswa.nama} />
      <DetailItem label="Username" value={siswa.username} />
      <DetailItem label="Email" value={siswa.email} />
      <DetailItem label="Kelas" value={siswa.kelas} />
      <DetailItem label="Tahun Masuk" value={siswa.tahun_masuk?.toString() ?? null} />
      <DetailItem label="No. Telepon" value={siswa.nomor_whatsapp} />
      <DetailItem label="Status Keanggotaan" value={statusLabel(siswa.status_keanggotaan)} />
      <DetailItem
        label="Password"
        value={siswa.password_tersedia ? "Sudah diatur" : "Belum diatur / dikosongkan"}
      />
    </div>
  );
}

type SiswaFormFields = {
  nisn: string;
  kelas: string;
  nama: string;
  username: string;
  email: string;
  tahunMasuk: string;
  nomorWhatsapp: string;
  statusKeanggotaan: string;
};

function getSiswaFormFields(siswa?: SiswaAccount): SiswaFormFields {
  return {
    nisn: siswa?.nisn ?? "",
    kelas: siswa?.kelas ?? "",
    nama: siswa?.nama ?? "",
    username: siswa?.username ?? "",
    email: siswa?.email ?? "",
    tahunMasuk: siswa?.tahun_masuk?.toString() ?? "",
    nomorWhatsapp: siswa?.nomor_whatsapp ?? "",
    statusKeanggotaan: siswa?.status_keanggotaan ?? "aktif",
  };
}

function SiswaForm({
  mode,
  siswa,
  onClose,
  onUpdated,
}: {
  mode: Exclude<ModalMode, "detail">;
  siswa?: SiswaAccount;
  onClose: () => void;
  onUpdated: (siswa: SiswaAccount) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action: (
    prevState: SiswaAdminActionState | undefined,
    formData: FormData
  ) => Promise<SiswaAdminActionState> =
    mode === "add" ? createSiswaByAdmin : updateSiswaByAdmin;
  const [fields, setFields] = useState(() => getSiswaFormFields(siswa));
  const [state, formAction, pending] = useActionState(async (
    prevState: SiswaAdminActionState | undefined,
    formData: FormData
  ) => {
    const nextState = await action(prevState, formData);

    if (mode === "edit" && nextState.siswa && siswa) {
      const updated = {
        ...siswa,
        ...nextState.siswa,
      } satisfies SiswaAccount;
      setFields(getSiswaFormFields(updated));
      onUpdated(updated);
    }

    return nextState;
  }, initialActionState);

  useEffect(() => {
    if (state.success && mode === "add") {
      formRef.current?.reset();
    }
  }, [mode, state.success]);

  function updateField(field: keyof SiswaFormFields, value: string) {
    setFields((currentFields) => ({
      ...currentFields,
      [field]: value,
    }));
  }

  const isEditMode = mode === "edit";

  return (
    <form ref={formRef} action={formAction} className="px-4 py-5 sm:px-7 sm:py-7">
      {siswa ? <input type="hidden" name="id_siswa" value={siswa.id_siswa} /> : null}

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field
          label="NIS"
          name="nisn"
          placeholder="Masukkan NIS"
          defaultValue={fields.nisn}
          value={isEditMode ? fields.nisn : undefined}
          onChange={(value) => updateField("nisn", value)}
          required
        />
        <Field
          label="Kelas"
          name="kelas"
          placeholder="Masukkan kelas resmi siswa"
          defaultValue={fields.kelas}
          value={isEditMode ? fields.kelas : undefined}
          onChange={(value) => updateField("kelas", value)}
          required
        />
        <Field
          label="Nama Lengkap"
          name="nama"
          placeholder="Masukkan nama lengkap"
          defaultValue={fields.nama}
          value={isEditMode ? fields.nama : undefined}
          onChange={(value) => updateField("nama", value)}
          className="sm:col-span-2"
          required
        />
        <Field
          label="Username"
          name="username"
          placeholder="Masukkan username"
          defaultValue={fields.username}
          value={isEditMode ? fields.username : undefined}
          onChange={(value) => updateField("username", value)}
          className="sm:col-span-2"
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="Masukkan email resmi siswa"
          defaultValue={fields.email}
          value={isEditMode ? fields.email : undefined}
          onChange={(value) => updateField("email", value)}
          className="sm:col-span-2"
          required
        />
        <Field
          label="Tahun Masuk"
          name="tahun_masuk"
          type="number"
          placeholder="Masukkan tahun masuk siswa"
          defaultValue={fields.tahunMasuk}
          value={isEditMode ? fields.tahunMasuk : undefined}
          onChange={(value) => updateField("tahunMasuk", value)}
          required
        />
        <Field
          label="No. Telepon"
          name="nomor_whatsapp"
          placeholder="Masukkan nomor WhatsApp aktif"
          defaultValue={fields.nomorWhatsapp}
          value={isEditMode ? fields.nomorWhatsapp : undefined}
          onChange={(value) => updateField("nomorWhatsapp", value)}
          required
        />
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold text-black">Status Keanggotaan</span>
          <span className="relative block">
            <select
              name="status_keanggotaan"
              {...(isEditMode
                ? {
                    value: fields.statusKeanggotaan,
                    onChange: (event: ChangeEvent<HTMLSelectElement>) =>
                      updateField("statusKeanggotaan", event.currentTarget.value),
                  }
                : { defaultValue: fields.statusKeanggotaan })}
              className="h-11 w-full appearance-none rounded-lg border border-transparent bg-[#f1f1f4] px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-[#020016]"
              required
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
              <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="chevron" className="h-4 w-4" />
            </span>
          </span>
        </label>
      </div>

      <ActionNotice state={state} />

      <div className="mt-8 flex flex-col justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-full min-w-20 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-50 sm:w-auto"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full min-w-36 items-center justify-center rounded-lg bg-[#020016] px-5 text-sm font-semibold text-white transition hover:bg-[#10102a] disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
        >
          {pending
            ? "Menyimpan..."
            : mode === "add"
              ? "Tambah Siswa"
              : "Simpan Data"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  value,
  onChange,
  className = "",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  const controlledProps =
    value === undefined
      ? { defaultValue }
      : {
          value,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChange?.(event.currentTarget.value),
        };

  return (
    <label className={`block min-w-0 space-y-2 ${className}`}>
      <span className="text-sm font-semibold text-black">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        {...controlledProps}
        required={required}
        className="h-11 w-full rounded-lg border border-transparent bg-[#f1f1f4] px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#020016]"
      />
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-black">{value || "-"}</p>
    </div>
  );
}

function ActionNotice({ state }: { state: SiswaAdminActionState }) {
  if (state.error) {
    return (
      <p className="mt-5 break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="mt-5 break-words rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  }

  return null;
}
