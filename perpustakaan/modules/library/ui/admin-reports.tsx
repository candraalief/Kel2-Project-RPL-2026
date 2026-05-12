"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type {
  AttendanceReportTab,
  AttendanceReportData,
  ReportFilters,
  ReportType,
  TransactionReportData,
  TransactionReportTab,
} from "@/modules/library/lib/reports";

const reportTypeLabels: Record<ReportType, string> = {
  absensi: "Absensi",
  transaksi: "Peminjaman",
};

const transactionTabs: {
  id: TransactionReportTab;
  label: string;
  getCount: (data: TransactionReportData) => number;
}[] = [
  {
    id: "transaksi",
    label: "Semua Peminjaman",
    getCount: (data) => data.transactions.length,
  },
  {
    id: "siswa",
    label: "Rekap Per Siswa",
    getCount: (data) => data.students.length,
  },
  {
    id: "buku",
    label: "Rekap Buku",
    getCount: (data) => data.books.length,
  },
];

const attendanceTabs: {
  id: AttendanceReportTab;
  label: string;
  getCount: (data: AttendanceReportData) => number;
}[] = [
  {
    id: "siswa",
    label: "Absensi Siswa",
    getCount: (data) => data.students.length,
  },
  {
    id: "umum",
    label: "Absensi Umum",
    getCount: (data) => data.publicVisitors.length,
  },
];

const statusToneClasses = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-[#1d66d6]",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
};

export function AdminReports({
  filters,
  transactionReportData,
  attendanceReportData,
  confirmDownload,
}: {
  filters: ReportFilters;
  transactionReportData: TransactionReportData | null;
  attendanceReportData: AttendanceReportData | null;
  confirmDownload: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm lg:p-6">
        <div>
          <ReportControlForm
            filters={filters}
            confirmDownload={confirmDownload}
          />
        </div>
      </section>

      {filters.type === "transaksi" && transactionReportData ? (
        <TransactionReportView
          filters={filters}
          reportData={transactionReportData}
        />
      ) : null}

      {filters.type === "absensi" && attendanceReportData ? (
        <AttendanceReportView
          filters={filters}
          reportData={attendanceReportData}
        />
      ) : null}

      {!transactionReportData && !attendanceReportData ? (
        <ReportPlaceholder type={filters.type} />
      ) : (
        null
      )}
    </div>
  );
}

function ReportControlForm({
  filters,
  confirmDownload,
}: {
  filters: ReportFilters;
  confirmDownload: boolean;
}) {
  const router = useRouter();

  function closeDownloadConfirm() {
    router.replace(buildReportHref(filters, {}), { scroll: false });
  }

  return (
    <>
      <form
        action="/admin/laporan"
        method="get"
        className="grid gap-4 xl:grid-cols-[1fr_1.7fr_1fr_auto_auto] xl:items-end"
      >
        <input
          type="hidden"
          name="tab"
          value={filters.type === "absensi" ? filters.attendanceTab : filters.tab}
        />

        <ControlField label="Jenis">
          <select
            name="jenis"
            defaultValue={filters.type}
            className="h-[42px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          >
            <option value="transaksi">Peminjaman</option>
            <option value="absensi">Absensi</option>
          </select>
        </ControlField>

        <div className="grid gap-3 sm:grid-cols-2">
          <ControlField label="Dari tanggal">
            <input
              type="date"
              name="mulai"
              defaultValue={filters.startDate}
              className="h-[42px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            />
          </ControlField>

          <ControlField label="Sampai tanggal">
            <input
              type="date"
              name="sampai"
              defaultValue={filters.endDate}
              className="h-[42px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            />
          </ControlField>
        </div>

        <ControlField label="Format">
          <div className="flex h-[42px] items-center gap-4 rounded-xl border border-zinc-300 bg-white px-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <input
                type="radio"
                name="format"
                value="pdf"
                defaultChecked={filters.format === "pdf"}
                className="h-4 w-4 accent-[#1d66d6]"
              />
              PDF
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <input
                type="radio"
                name="format"
                value="excel"
                defaultChecked={filters.format === "excel"}
                className="h-4 w-4 accent-[#1d66d6]"
              />
              Excel
            </label>
          </div>
        </ControlField>

        <button
          type="submit"
          className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] active:bg-[#0f4698]"
        >
          Tampilkan
        </button>

        <button
          type="submit"
          name="unduh"
          value="1"
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] active:bg-[#0f4698]"
        >
          <DownloadIcon />
          Unduh
        </button>
      </form>

      {confirmDownload ? (
        <DownloadConfirmModal
          filters={filters}
          onClose={closeDownloadConfirm}
        />
      ) : null}
    </>
  );
}

function DownloadConfirmModal({
  filters,
  onClose,
}: {
  filters: ReportFilters;
  onClose: () => void;
}) {
  const canDownloadExcel = filters.format === "excel";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-report-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d66d6]">
              Konfirmasi Unduh
            </p>
            <h2
              id="download-report-title"
              className="mt-1 text-2xl font-semibold text-zinc-950"
            >
              Unduh laporan {reportTypeLabels[filters.type].toLowerCase()}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Tutup konfirmasi"
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <p>
            Pastikan jenis laporan, periode, dan format file sudah sesuai sebelum
            mengunduh.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-zinc-600">
            <p>
              Jenis:{" "}
              <span className="font-semibold text-zinc-950">
                {reportTypeLabels[filters.type]}
              </span>
            </p>
            <p>
              Periode:{" "}
              <span className="font-semibold text-zinc-950">
                {formatDisplayDate(filters.startDate)} -{" "}
                {formatDisplayDate(filters.endDate)}
              </span>
            </p>
            <p>
              Format:{" "}
              <span className="font-semibold text-zinc-950">
                {filters.format === "excel" ? "Excel" : "PDF"}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Kembali
          </button>
          {canDownloadExcel ? (
            <a
              href={buildReportDownloadHref(filters)}
              className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#1d66d6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1553b2]"
            >
              <DownloadIcon />
              Unduh Excel
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-zinc-300 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <DownloadIcon />
              Belum tersedia
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function TransactionReportView({
  filters,
  reportData,
}: {
  filters: ReportFilters;
  reportData: TransactionReportData;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Laporan Peminjaman
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
              {transactionTabs.find((tab) => tab.id === filters.tab)?.label}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Periode {reportData.periodLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {transactionTabs.map((tab) => {
              const isActive = tab.id === filters.tab;

              return (
                <Link
                  key={tab.id}
                  href={buildReportHref(filters, { tab: tab.id })}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#1d66d6] bg-[#1d66d6] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#e6f0ff] text-[#1d66d6]"
                    }`}
                  >
                    {tab.getCount(reportData)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          {filters.tab === "transaksi" ? (
            <TransactionsReportTable rows={reportData.transactions} />
          ) : null}
          {filters.tab === "siswa" ? (
            <StudentReportTable rows={reportData.students} />
          ) : null}
          {filters.tab === "buku" ? <BookReportTable rows={reportData.books} /> : null}
        </div>
      </section>
    </div>
  );
}

function AttendanceReportView({
  filters,
  reportData,
}: {
  filters: ReportFilters;
  reportData: AttendanceReportData;
}) {
  const router = useRouter();
  const rows =
    filters.attendanceTab === "umum"
      ? reportData.publicVisitors
      : reportData.students;
  const activeLabel =
    attendanceTabs.find((tab) => tab.id === filters.attendanceTab)?.label ??
    "Absensi Siswa";

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Laporan Absensi
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
              {activeLabel}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Periode {reportData.periodLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {attendanceTabs.map((tab) => {
              const isActive = tab.id === filters.attendanceTab;

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    router.replace(
                      buildReportHref(filters, { attendanceTab: tab.id }),
                      { scroll: false }
                    );
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#1d66d6] bg-[#1d66d6] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#e6f0ff] text-[#1d66d6]"
                    }`}
                  >
                    {tab.getCount(reportData)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <AttendanceReportTable rows={rows} />
        </div>
      </section>
    </div>
  );
}

function AttendanceReportTable({
  rows,
}: {
  rows: AttendanceReportData["students"];
}) {
  if (rows.length === 0) {
    return <EmptyReportState text="Belum ada absensi pada periode ini." />;
  }

  return (
    <ReportTable minWidth="620px">
      <thead>
        <tr>
          <ReportHeader>Nama</ReportHeader>
          <ReportHeader>Tanggal</ReportHeader>
          <ReportHeader>Waktu</ReportHeader>
          <ReportHeader>Tujuan</ReportHeader>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-zinc-200">
            <ReportCell className="font-semibold text-zinc-950">{row.name}</ReportCell>
            <ReportCell>{row.date}</ReportCell>
            <ReportCell>{row.time}</ReportCell>
            <ReportCell>{row.purpose}</ReportCell>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function TransactionsReportTable({
  rows,
}: {
  rows: TransactionReportData["transactions"];
}) {
  if (rows.length === 0) {
    return <EmptyReportState text="Belum ada peminjaman pada periode ini." />;
  }

  return (
    <ReportTable minWidth="1180px">
      <thead>
        <tr>
          <ReportHeader>ID</ReportHeader>
          <ReportHeader>Siswa</ReportHeader>
          <ReportHeader>Pinjam</ReportHeader>
          <ReportHeader>Deadline</ReportHeader>
          <ReportHeader>Kembali</ReportHeader>
          <ReportHeader>Total</ReportHeader>
          <ReportHeader>Status</ReportHeader>
          <ReportHeader>Info Deadline</ReportHeader>
          <ReportHeader>Buku</ReportHeader>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-zinc-200">
            <ReportCell className="font-semibold text-zinc-950">#{row.id}</ReportCell>
            <ReportCell>
              <span className="block font-semibold text-zinc-950">{row.studentName}</span>
              <span className="block text-xs text-zinc-500">
                {row.nisn} / {row.className}
              </span>
            </ReportCell>
            <ReportCell>{row.borrowedAt}</ReportCell>
            <ReportCell>{row.dueAt}</ReportCell>
            <ReportCell>{row.returnedAt}</ReportCell>
            <ReportCell>{row.totalBooks}</ReportCell>
            <ReportCell>
              <StatusBadge tone={row.statusTone}>{row.statusLabel}</StatusBadge>
            </ReportCell>
            <ReportCell>{row.deadlineLabel}</ReportCell>
            <ReportCell className="max-w-[320px] text-zinc-600">{row.booksText}</ReportCell>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function StudentReportTable({
  rows,
}: {
  rows: TransactionReportData["students"];
}) {
  if (rows.length === 0) {
    return <EmptyReportState text="Belum ada rekap siswa pada periode ini." />;
  }

  return (
    <ReportTable minWidth="780px">
      <thead>
        <tr>
          <ReportHeader>Siswa</ReportHeader>
          <ReportHeader>Banyak Peminjaman</ReportHeader>
          <ReportHeader>Peminjaman Aktif</ReportHeader>
          <ReportHeader>Dikembalikan Tepat Waktu</ReportHeader>
          <ReportHeader>Dikembalikan Terlambat</ReportHeader>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-zinc-200">
            <ReportCell>
              <span className="block font-semibold text-zinc-950">{row.studentName}</span>
              <span className="block text-xs text-zinc-500">
                {row.nisn} / {row.className}
              </span>
            </ReportCell>
            <ReportCell>{row.totalTransactions}</ReportCell>
            <ReportCell>{row.activeTransactions}</ReportCell>
            <ReportCell>{row.returnedOnTimeTransactions}</ReportCell>
            <ReportCell>{row.returnedLateTransactions}</ReportCell>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function BookReportTable({ rows }: { rows: TransactionReportData["books"] }) {
  if (rows.length === 0) {
    return <EmptyReportState text="Belum ada buku yang dipinjam pada periode ini." />;
  }

  return (
    <ReportTable minWidth="860px">
      <thead>
        <tr>
          <ReportHeader>Judul Buku</ReportHeader>
          <ReportHeader>Penulis</ReportHeader>
          <ReportHeader>Total Eksemplar Dipinjam Dalam Periode Ini</ReportHeader>
          <ReportHeader>Eksemplar Hilang Dalam Periode Ini</ReportHeader>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-zinc-200">
            <ReportCell className="font-semibold text-zinc-950">{row.title}</ReportCell>
            <ReportCell>{row.author}</ReportCell>
            <ReportCell>{row.totalBorrowed}</ReportCell>
            <ReportCell>{row.lostCopies}</ReportCell>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function ReportPlaceholder({ type }: { type: ReportType }) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {reportTypeLabels[type]}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
        Laporan ini belum dibuka
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
        Jenis laporan sudah tersedia di dropdown. Untuk sekarang, data yang
        ditampilkan baru laporan peminjaman.
      </p>
    </section>
  );
}

function ControlField({
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

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function ReportTable({
  minWidth,
  children,
}: {
  minWidth: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}

function ReportHeader({ children }: { children: ReactNode }) {
  return (
    <th className="bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
      {children}
    </th>
  );
}

function ReportCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-zinc-600 ${className}`}>
      {children}
    </td>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof statusToneClasses;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${statusToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyReportState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 4v10m0 0l4-4m-4 4l-4-4M5 20h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function buildReportHref(
  filters: ReportFilters,
  overrides: Partial<ReportFilters>
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("jenis", next.type);
  params.set("mulai", next.startDate);
  params.set("sampai", next.endDate);
  params.set("format", next.format);
  params.set("tab", next.type === "absensi" ? next.attendanceTab : next.tab);

  return `/admin/laporan?${params.toString()}`;
}

function buildReportDownloadHref(filters: ReportFilters) {
  const params = new URLSearchParams();

  params.set("jenis", filters.type);
  params.set("mulai", filters.startDate);
  params.set("sampai", filters.endDate);
  params.set("format", filters.format);
  params.set(
    "tab",
    filters.type === "absensi" ? filters.attendanceTab : filters.tab
  );

  return `/admin/laporan/unduh?${params.toString()}`;
}
