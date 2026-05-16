"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type {
  AttendanceReportData,
  AttendanceReportTab,
  CollectionReportData,
  CollectionReportPeriod,
  CollectionReportTab,
  ReportFilters,
  ReportType,
  TransactionReportData,
  TransactionReportTab,
} from "@/modules/library/lib/reports";
import {
  ButtonLoadingSpinner,
  useButtonPressLoading,
} from "@/modules/shared/ui/button-loading";

const reportTypeLabels: Record<ReportType, string> = {
  absensi: "Absensi",
  koleksi: "Koleksi Buku",
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
];

const collectionTabs: {
  id: CollectionReportTab;
  label: string;
  getCount: (data: CollectionReportData) => number;
}[] = [
  {
    id: "inventaris",
    label: "Inventaris Buku",
    getCount: (data) => data.inventory.length,
  },
  {
    id: "populer",
    label: "Buku Terpopuler",
    getCount: (data) => data.popular.length,
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

const previewPageSize = 10;

export function AdminReports({
  filters,
  transactionReportData,
  collectionReportData,
  attendanceReportData,
  confirmDownload,
}: {
  filters: ReportFilters;
  transactionReportData: TransactionReportData | null;
  collectionReportData: CollectionReportData | null;
  attendanceReportData: AttendanceReportData | null;
  confirmDownload: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <ReportControlForm
          key={[
            filters.type,
            filters.format,
            filters.collectionPeriod,
            filters.collectionMonth,
            filters.collectionYear,
          ].join(":")}
          filters={filters}
          confirmDownload={confirmDownload}
        />
      </section>

      {filters.type === "transaksi" && transactionReportData ? (
        <TransactionReportView
          filters={filters}
          reportData={transactionReportData}
        />
      ) : null}

      {filters.type === "koleksi" && collectionReportData ? (
        <CollectionReportView filters={filters} reportData={collectionReportData} />
      ) : null}

      {filters.type === "absensi" && attendanceReportData ? (
        <AttendanceReportView
          filters={filters}
          reportData={attendanceReportData}
        />
      ) : null}
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
  const [isFilterPending, startFilterTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<ReportType>(filters.type);
  const [selectedCollectionPeriod, setSelectedCollectionPeriod] =
    useState<CollectionReportPeriod>(filters.collectionPeriod);
  const [selectedCollectionMonth, setSelectedCollectionMonth] = useState(
    filters.collectionMonth
  );
  const [selectedCollectionYear, setSelectedCollectionYear] = useState(
    filters.collectionYear
  );
  const [selectedFormat, setSelectedFormat] = useState(filters.format);

  function applyReportFilters(overrides: Partial<ReportFilters>) {
    startFilterTransition(() => {
      router.replace(buildReportHref(filters, overrides), { scroll: false });
    });
  }

  function resetReportFilters() {
    startFilterTransition(() => {
      router.replace("/admin/laporan", { scroll: false });
    });
  }

  function closeDownloadConfirm() {
    router.replace(buildReportHref(filters, {}), { scroll: false });
  }

  const hiddenTab =
    selectedType === "absensi"
      ? filters.attendanceTab
      : selectedType === "koleksi"
        ? filters.collectionTab
        : filters.tab;

  return (
    <>
      <form
        action="/admin/laporan"
        method="get"
        className="grid gap-4 xl:grid-cols-[1fr_2fr_1fr_auto_auto] xl:items-end"
      >
        <input type="hidden" name="tab" value={hiddenTab} />

        <ControlField label="Jenis">
          <select
            name="jenis"
            value={selectedType}
            onChange={(event) => {
              const nextType = event.target.value as ReportType;

              setSelectedType(nextType);
              applyReportFilters({
                type: nextType,
                tab: "transaksi",
                collectionTab: "inventaris",
                attendanceTab: "siswa",
              });
            }}
            className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          >
            <option value="transaksi">Peminjaman</option>
            <option value="koleksi">Koleksi Buku</option>
            <option value="absensi">Absensi</option>
          </select>
        </ControlField>

        <div className="grid gap-3 sm:grid-cols-2">
          <ControlField label="Periode">
            <select
              name="periode"
              value={selectedCollectionPeriod}
              onChange={(event) => {
                const nextPeriod = event.target.value as CollectionReportPeriod;

                setSelectedCollectionPeriod(nextPeriod);
                applyReportFilters({ collectionPeriod: nextPeriod });
              }}
              className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
              <option value="all">Sepanjang waktu</option>
            </select>
          </ControlField>

          <ControlField
            label={
              selectedCollectionPeriod === "yearly"
                ? "Tahun"
                : selectedCollectionPeriod === "monthly"
                  ? "Bulan"
                  : "Waktu"
            }
          >
            {selectedCollectionPeriod === "yearly" ? (
              <input
                type="number"
                name="tahun"
                min="1900"
                value={selectedCollectionYear}
                onChange={(event) => {
                  const nextYear = event.currentTarget.value;

                  setSelectedCollectionYear(nextYear);
                  applyReportFilters({ collectionYear: nextYear });
                }}
                className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
              />
            ) : selectedCollectionPeriod === "monthly" ? (
              <input
                type="month"
                name="bulan"
                value={selectedCollectionMonth}
                onChange={(event) => {
                  const nextMonth = event.currentTarget.value;

                  setSelectedCollectionMonth(nextMonth);
                  applyReportFilters({ collectionMonth: nextMonth });
                }}
                className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
              />
            ) : (
              <div className="flex min-h-[44px] items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-500">
                Semua data
              </div>
            )}
          </ControlField>
        </div>

        <ControlField label="Format">
          <div className="flex min-h-[44px] items-center gap-4 rounded-xl border border-zinc-300 bg-white px-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={selectedFormat === "pdf"}
                onChange={() => {
                  setSelectedFormat("pdf");
                  applyReportFilters({ format: "pdf" });
                }}
                className="h-4 w-4 accent-[#1d66d6]"
              />
              PDF
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <input
                type="radio"
                name="format"
                value="excel"
                checked={selectedFormat === "excel"}
                onChange={() => {
                  setSelectedFormat("excel");
                  applyReportFilters({ format: "excel" });
                }}
                className="h-4 w-4 accent-[#1d66d6]"
              />
              Excel
            </label>
          </div>
        </ControlField>

        <button
          type="button"
          onClick={resetReportFilters}
          disabled={isFilterPending}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 xl:w-auto"
        >
          Reset Filter
        </button>

        <button
          type="submit"
          name="unduh"
          value="1"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] active:bg-[#0f4698] xl:w-auto"
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-report-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5"
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
                {formatCollectionPeriod(filters)}
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

        <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] w-full min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 sm:w-auto"
          >
            Kembali
          </button>
          <a
            href={buildReportDownloadHref(filters)}
            className="inline-flex min-h-[44px] w-full min-w-28 items-center justify-center gap-2 rounded-xl bg-[#1d66d6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1553b2] sm:w-auto"
          >
            <DownloadIcon />
            Unduh {filters.format === "excel" ? "Excel" : "PDF"}
          </a>
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
    <ReportSection
      eyebrow="Laporan Peminjaman"
      title={transactionTabs.find((tab) => tab.id === filters.tab)?.label}
      description={`Periode ${reportData.periodLabel}`}
      tabs={transactionTabs.map((tab) => ({
        href: buildReportHref(filters, { tab: tab.id }),
        isActive: tab.id === filters.tab,
        label: tab.label,
        count: tab.getCount(reportData),
      }))}
    >
      {filters.tab === "transaksi" ? (
        <TransactionsReportTable rows={reportData.transactions} />
      ) : null}
      {filters.tab === "siswa" ? (
        <StudentReportTable rows={reportData.students} />
      ) : null}
    </ReportSection>
  );
}

function CollectionReportView({
  filters,
  reportData,
}: {
  filters: ReportFilters;
  reportData: CollectionReportData;
}) {
  return (
    <ReportSection
      eyebrow="Laporan Koleksi"
      title={collectionTabs.find((tab) => tab.id === filters.collectionTab)?.label}
      description={
        filters.collectionTab === "inventaris"
          ? "Snapshot kondisi koleksi saat ini"
          : `Periode ${reportData.periodLabel}`
      }
      tabs={collectionTabs.map((tab) => ({
        href: buildReportHref(filters, { collectionTab: tab.id }),
        isActive: tab.id === filters.collectionTab,
        label: tab.label,
        count: tab.getCount(reportData),
      }))}
    >
      {filters.collectionTab === "inventaris" ? (
        <InventoryReportTable rows={reportData.inventory} />
      ) : (
        <PopularBooksReportTable rows={reportData.popular} />
      )}
    </ReportSection>
  );
}

function AttendanceReportView({
  filters,
  reportData,
}: {
  filters: ReportFilters;
  reportData: AttendanceReportData;
}) {
  const rows =
    filters.attendanceTab === "umum"
      ? reportData.publicVisitors
      : reportData.students;

  return (
    <ReportSection
      eyebrow="Laporan Absensi"
      title={attendanceTabs.find((tab) => tab.id === filters.attendanceTab)?.label}
      description={`Periode ${reportData.periodLabel}`}
      tabs={attendanceTabs.map((tab) => ({
        href: buildReportHref(filters, { attendanceTab: tab.id }),
        isActive: tab.id === filters.attendanceTab,
        label: tab.label,
        count: tab.getCount(reportData),
      }))}
    >
      <AttendanceReportTable tab={filters.attendanceTab} rows={rows} />
    </ReportSection>
  );
}

function ReportSection({
  eyebrow,
  title,
  description,
  tabs,
  children,
}: {
  eyebrow: string;
  title?: string;
  description: string;
  tabs: Array<{
    href: string;
    isActive: boolean;
    label: string;
    count: number;
  }>;
  children: ReactNode;
}) {
  const {
    loadingKey: loadingHref,
    startLoading: startTabLoading,
    clearLoading: clearTabLoading,
  } = useButtonPressLoading<string>(4000);
  const activeHref = tabs.find((tab) => tab.isActive)?.href ?? "";

  useEffect(() => {
    clearTabLoading();
  }, [activeHref, clearTabLoading]);

  return (
    <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
          {title}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>

      <nav
        className="-mx-4 mt-5 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        aria-label={`${eyebrow} tab`}
      >
        {tabs.map((tab) => {
          const isLoading = loadingHref === tab.href && !tab.isActive;
          const isHighlighted = tab.isActive || isLoading;

          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              aria-busy={isLoading}
              onClick={(event) => {
                if (
                  tab.isActive ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                startTabLoading(tab.href);
              }}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                isHighlighted
                  ? "border-[#1d66d6] bg-[#1d66d6] text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {isLoading ? <ButtonLoadingSpinner /> : null}
              {tab.label}
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs ${
                  isHighlighted
                    ? "bg-white/20 text-white"
                    : "bg-[#e6f0ff] text-[#1d66d6]"
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function TransactionsReportTable({
  rows,
}: {
  rows: TransactionReportData["transactions"];
}) {
  return (
    <PaginatedReportTable
      rows={rows}
      emptyText="Belum ada peminjaman pada periode ini."
      minWidth="980px"
      columns={
        <>
          <ReportHeader>ID Transaksi</ReportHeader>
          <ReportHeader>Nama Siswa</ReportHeader>
          <ReportHeader>Kelas</ReportHeader>
          <ReportHeader>Judul Buku</ReportHeader>
          <ReportHeader>Tanggal Pinjam</ReportHeader>
          <ReportHeader>Jatuh Tempo</ReportHeader>
          <ReportHeader>Tanggal Kembali</ReportHeader>
          <ReportHeader>Status</ReportHeader>
        </>
      }
      rowKey={(row, index) => `${row.id}:${row.bookTitle}:${index}`}
      renderRow={(row) => (
        <>
          <ReportCell className="font-semibold text-zinc-950">
            #{row.id}
          </ReportCell>
          <ReportCell className="font-semibold text-zinc-950">
            {row.studentName}
          </ReportCell>
          <ReportCell>{row.className}</ReportCell>
          <ReportCell className="max-w-[280px] text-zinc-600">
            {row.bookTitle}
          </ReportCell>
          <ReportCell>{row.borrowedAt}</ReportCell>
          <ReportCell>{row.dueAt}</ReportCell>
          <ReportCell>{row.returnedAt}</ReportCell>
          <ReportCell>
            <StatusBadge tone={row.statusTone}>{row.statusLabel}</StatusBadge>
          </ReportCell>
        </>
      )}
    />
  );
}

function StudentReportTable({
  rows,
}: {
  rows: TransactionReportData["students"];
}) {
  return (
    <PaginatedReportTable
      rows={rows}
      emptyText="Belum ada rekap siswa pada periode ini."
      minWidth="820px"
      columns={
        <>
          <ReportHeader>Nama Siswa</ReportHeader>
          <ReportHeader>Kelas</ReportHeader>
          <ReportHeader>Total Transaksi</ReportHeader>
          <ReportHeader>Sedang Dipinjam</ReportHeader>
          <ReportHeader>Dikembalikan Tepat Waktu</ReportHeader>
          <ReportHeader>Terlambat</ReportHeader>
        </>
      }
      rowKey={(row) => row.id}
      renderRow={(row) => (
        <>
          <ReportCell className="font-semibold text-zinc-950">
            {row.studentName}
          </ReportCell>
          <ReportCell>{row.className}</ReportCell>
          <ReportCell>{row.totalTransactions}</ReportCell>
          <ReportCell>{row.activeTransactions}</ReportCell>
          <ReportCell>{row.returnedOnTimeTransactions}</ReportCell>
          <ReportCell>{row.lateTransactions}</ReportCell>
        </>
      )}
    />
  );
}

function InventoryReportTable({
  rows,
}: {
  rows: CollectionReportData["inventory"];
}) {
  return (
    <PaginatedReportTable
      rows={rows}
      emptyText="Belum ada data inventaris buku."
      minWidth="760px"
      columns={
        <>
          <ReportHeader>Judul Buku</ReportHeader>
          <ReportHeader>Penulis</ReportHeader>
          <ReportHeader>Eksemplar Aktif</ReportHeader>
          <ReportHeader>Eksemplar Dikeluarkan</ReportHeader>
        </>
      }
      rowKey={(row) => row.id}
      renderRow={(row) => (
        <>
          <ReportCell className="font-semibold text-zinc-950">
            {row.title}
          </ReportCell>
          <ReportCell>{row.author}</ReportCell>
          <ReportCell>{row.activeCopies}</ReportCell>
          <ReportCell>{row.removedCopies}</ReportCell>
        </>
      )}
    />
  );
}

function PopularBooksReportTable({
  rows,
}: {
  rows: CollectionReportData["popular"];
}) {
  return (
    <PaginatedReportTable
      rows={rows}
      emptyText="Belum ada buku yang dipinjam pada periode popularitas ini."
      minWidth="700px"
      columns={
        <>
          <ReportHeader>Ranking</ReportHeader>
          <ReportHeader>Judul Buku</ReportHeader>
          <ReportHeader>Penulis</ReportHeader>
          <ReportHeader>Total Dipinjam</ReportHeader>
        </>
      }
      rowKey={(row) => row.key}
      renderRow={(row) => (
        <>
          <ReportCell className="font-semibold text-zinc-950">
            #{row.rank}
          </ReportCell>
          <ReportCell className="font-semibold text-zinc-950">
            {row.title}
          </ReportCell>
          <ReportCell>{row.author}</ReportCell>
          <ReportCell>{row.totalBorrowed}</ReportCell>
        </>
      )}
    />
  );
}

function AttendanceReportTable({
  tab,
  rows,
}: {
  tab: AttendanceReportTab;
  rows: AttendanceReportData["students"];
}) {
  return (
    <PaginatedReportTable
      rows={rows}
      emptyText="Belum ada absensi pada periode ini."
      minWidth="720px"
      columns={
        tab === "siswa" ? (
          <>
            <ReportHeader>Nama</ReportHeader>
            <ReportHeader>Kelas Saat Absen</ReportHeader>
            <ReportHeader>Tujuan Kunjungan</ReportHeader>
            <ReportHeader>Waktu</ReportHeader>
          </>
        ) : (
          <>
            <ReportHeader>Nama</ReportHeader>
            <ReportHeader>Instansi Asal</ReportHeader>
            <ReportHeader>Tujuan Kunjungan</ReportHeader>
            <ReportHeader>Waktu</ReportHeader>
          </>
        )
      }
      rowKey={(row) => row.id}
      renderRow={(row) =>
        tab === "siswa" ? (
          <>
            <ReportCell className="font-semibold text-zinc-950">
              {row.name}
            </ReportCell>
            <ReportCell>{row.className}</ReportCell>
            <ReportCell>{row.purpose}</ReportCell>
            <ReportCell>{row.visitedAt}</ReportCell>
          </>
        ) : (
          <>
            <ReportCell className="font-semibold text-zinc-950">
              {row.name}
            </ReportCell>
            <ReportCell>{row.institution}</ReportCell>
            <ReportCell>{row.purpose}</ReportCell>
            <ReportCell>{row.visitedAt}</ReportCell>
          </>
        )
      }
    />
  );
}

function PaginatedReportTable<T>({
  rows,
  emptyText,
  minWidth,
  columns,
  rowKey,
  renderRow,
}: {
  rows: T[];
  emptyText: string;
  minWidth: string;
  columns: ReactNode;
  rowKey: (row: T, index: number) => string | number;
  renderRow: (row: T, index: number) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / previewPageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * previewPageSize;
  const visibleRows = useMemo(
    () => rows.slice(startIndex, startIndex + previewPageSize),
    [rows, startIndex]
  );

  if (rows.length === 0) {
    return <EmptyReportState text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      <ReportTable minWidth={minWidth}>
        <thead>
          <tr>{columns}</tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr
              key={rowKey(row, startIndex + index)}
              className="border-t border-zinc-200"
            >
              {renderRow(row, startIndex + index)}
            </tr>
          ))}
        </tbody>
      </ReportTable>

      <div className="flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {startIndex + 1}-{Math.min(startIndex + visibleRows.length, rows.length)} dari{" "}
          {rows.length} data
        </span>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage <= 1}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 px-3 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            Sebelumnya
          </button>
          <span className="min-w-16 text-center font-semibold text-zinc-900">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage >= totalPages}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 px-3 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
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
    <label className="min-w-0 space-y-1.5 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatCollectionPeriod(filters: ReportFilters) {
  if (filters.collectionPeriod === "all") {
    return "Sepanjang waktu";
  }

  if (filters.collectionPeriod === "yearly") {
    return filters.collectionYear;
  }

  const [year, month] = filters.collectionMonth.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
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
      <div className="overflow-x-auto pb-2">
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
  params.set("format", next.format);
  params.set("periode", next.collectionPeriod);
  params.set("bulan", next.collectionMonth);
  params.set("tahun", next.collectionYear);
  params.set(
    "tab",
    next.type === "absensi"
      ? next.attendanceTab
      : next.type === "koleksi"
        ? next.collectionTab
        : next.tab
  );

  return `/admin/laporan?${params.toString()}`;
}

function buildReportDownloadHref(filters: ReportFilters) {
  const params = new URLSearchParams();

  params.set("jenis", filters.type);
  params.set("format", filters.format);
  params.set("periode", filters.collectionPeriod);
  params.set("bulan", filters.collectionMonth);
  params.set("tahun", filters.collectionYear);
  params.set(
    "tab",
    filters.type === "absensi"
      ? filters.attendanceTab
      : filters.type === "koleksi"
        ? filters.collectionTab
        : filters.tab
  );

  return `/admin/laporan/unduh?${params.toString()}`;
}
