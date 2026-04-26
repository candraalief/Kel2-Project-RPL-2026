import type {
  AbsensiRecord,
  BukuRecord,
  TransaksiRecord,
} from "../lib/data";

function formatAttendanceTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      {subtitle ? (
        <h2 className="mt-2 text-2xl font-semibold text-zinc-900">{subtitle}</h2>
      ) : null}
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function BooksTable({ books }: { books: BukuRecord[] }) {
  if (books.length === 0) {
    return <EmptyState text="Belum ada data buku." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
        <span>Judul</span>
        <span>Penulis</span>
        <span>Rak</span>
        <span>Stok</span>
      </div>
      {books.map((book) => (
        <div
          key={book.id_buku}
          className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr] border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600"
        >
          <span className="font-medium text-zinc-900">{book.judul}</span>
          <span>{book.penulis ?? "-"}</span>
          <span>{book.lokasi_rak ?? "-"}</span>
          <span>{book.stok_buku ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

export function TransactionsTable({
  transactions,
}: {
  transactions: TransaksiRecord[];
}) {
  if (transactions.length === 0) {
    return <EmptyState text="Belum ada data transaksi." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="grid grid-cols-[0.6fr_0.8fr_0.8fr_0.8fr_0.8fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
        <span>ID</span>
        <span>ID Siswa</span>
        <span>Pinjam</span>
        <span>Jatuh Tempo</span>
        <span>Status</span>
      </div>
      {transactions.map((trx) => (
        <div
          key={trx.id_transaksi}
          className="grid grid-cols-[0.6fr_0.8fr_0.8fr_0.8fr_0.8fr] border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600"
        >
          <span className="font-medium text-zinc-900">{trx.id_transaksi}</span>
          <span>{trx.id_siswa}</span>
          <span>{trx.tanggal_pinjam}</span>
          <span>{trx.tanggal_jatuh_tempo}</span>
          <span>{trx.status ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

export function AttendanceTable({
  records,
  scrollable = false,
}: {
  records: AbsensiRecord[];
  scrollable?: boolean;
}) {
  if (records.length === 0) {
    return <EmptyState text="Belum ada data absensi." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="grid grid-cols-[1.1fr_1fr_0.8fr_1fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
        <span>Nama</span>
        <span>Tujuan</span>
        <span>Jenis</span>
        <span>Waktu</span>
      </div>
      <div className={scrollable ? "max-h-[360px] overflow-y-auto" : undefined}>
        {records.map((record) => (
          <div
            key={record.id_absensi}
            className="grid grid-cols-[1.1fr_1fr_0.8fr_1fr] border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600"
          >
            <span className="font-medium text-zinc-900">{record.nama}</span>
            <span>{record.tujuan ?? "-"}</span>
            <span>{record.jenis_pengunjung ?? "-"}</span>
            <span>{formatAttendanceTime(record.waktu_kunjungan)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
      {text}
    </div>
  );
}
