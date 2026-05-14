import type { AdminCatalogBook } from "./catalog";
import type { AbsensiRecord, DetailedTransactionRecord } from "./data";

export type ReportType = "transaksi" | "koleksi" | "absensi";
export type ReportFormat = "pdf" | "excel";
export type TransactionReportTab = "transaksi" | "siswa";
export type CollectionReportTab = "inventaris" | "populer";
export type CollectionReportPeriod = "monthly" | "yearly" | "all";
export type AttendanceReportTab = "siswa" | "umum";

export type ReportFilters = {
  type: ReportType;
  format: ReportFormat;
  startDate: string;
  endDate: string;
  tab: TransactionReportTab;
  collectionTab: CollectionReportTab;
  collectionPeriod: CollectionReportPeriod;
  collectionMonth: string;
  collectionYear: string;
  attendanceTab: AttendanceReportTab;
};

export type TransactionReportSummary = {
  totalTransactions: number;
  activeTransactions: number;
  completedTransactions: number;
  lateTransactions: number;
  totalBorrowedBooks: number;
};

export type TransactionReportRow = {
  id: number;
  studentName: string;
  className: string;
  bookTitle: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string;
  statusLabel: "Dipinjam" | "Dikembalikan" | "Terlambat";
  statusTone: "blue" | "green" | "red" | "amber";
};

export type StudentTransactionReportRow = {
  id: number;
  studentName: string;
  className: string;
  totalTransactions: number;
  activeTransactions: number;
  returnedOnTimeTransactions: number;
  lateTransactions: number;
};

export type TransactionReportData = {
  periodLabel: string;
  summary: TransactionReportSummary;
  transactions: TransactionReportRow[];
  students: StudentTransactionReportRow[];
};

export type CollectionInventoryReportRow = {
  id: number;
  title: string;
  author: string;
  activeCopies: number;
  removedCopies: number;
};

export type PopularBookReportRow = {
  key: string;
  rank: number;
  title: string;
  author: string;
  totalBorrowed: number;
};

export type CollectionReportData = {
  periodLabel: string;
  inventory: CollectionInventoryReportRow[];
  popular: PopularBookReportRow[];
};

export type AttendanceReportRow = {
  id: number;
  name: string;
  className: string;
  institution: string;
  purpose: string;
  visitedAt: string;
};

export type AttendanceReportData = {
  periodLabel: string;
  students: AttendanceReportRow[];
  publicVisitors: AttendanceReportRow[];
};

type StudentAccumulator = {
  id: number;
  studentName: string;
  className: string;
  totalTransactions: number;
  activeTransactions: number;
  returnedOnTimeTransactions: number;
  lateTransactions: number;
};

const dayInMs = 86_400_000;

export function getTodayDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function getDefaultReportStartDate(today = getTodayDateKey()) {
  return `${today.slice(0, 8)}01`;
}

export function getDefaultReportMonth(today = getTodayDateKey()) {
  return today.slice(0, 7);
}

export function getDefaultReportYear(today = getTodayDateKey()) {
  return today.slice(0, 4);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

export function isYearKey(value: string) {
  return /^\d{4}$/.test(value);
}

export function normalizeReportDate(value: string, fallback: string) {
  return isDateKey(value) ? value : fallback;
}

export function normalizeReportMonth(value: string, fallback: string) {
  return isMonthKey(value) ? value : fallback;
}

export function normalizeReportYear(value: string, fallback: string) {
  return isYearKey(value) ? value : fallback;
}

export function formatReportDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const dateKey = toDateKey(value);

  if (!dateKey) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(dateFromDateKey(dateKey));
}

export function buildTransactionReport(
  transactions: DetailedTransactionRecord[],
  filters: Pick<
    ReportFilters,
    | "startDate"
    | "endDate"
    | "collectionPeriod"
    | "collectionMonth"
    | "collectionYear"
  >
): TransactionReportData {
  const todayKey = getTodayDateKey();
  const filteredTransactions = transactions.filter((transaction) => {
    const borrowedKey = toDateKey(transaction.tanggal_pinjam);

    if (!borrowedKey) {
      return false;
    }

    return borrowedKey >= filters.startDate && borrowedKey <= filters.endDate;
  });
  const studentMap = new Map<number, StudentAccumulator>();
  const rows: TransactionReportRow[] = [];
  let activeTransactions = 0;
  let completedTransactions = 0;
  let lateTransactions = 0;
  let totalBorrowedBooks = 0;

  filteredTransactions.forEach((transaction) => {
    const totalBooks = getTotalBooks(transaction);
    const status = getTransactionStatus(transaction, todayKey);
    const isActive = !transaction.tanggal_kembali;
    const items = getReportItems(transaction);

    totalBorrowedBooks += totalBooks;

    if (isActive) {
      activeTransactions += 1;
    } else {
      completedTransactions += 1;
    }

    if (status.isLate) {
      lateTransactions += 1;
    }

    collectStudentSummary(studentMap, transaction, isActive, status.isLate);

    items.forEach((item) => {
      const bookTitle = formatBookTitle(item.title, item.quantity);

      rows.push({
        id: transaction.id_transaksi,
        studentName: transaction.siswa?.nama ?? "Siswa tidak diketahui",
        className: transaction.siswa?.kelas ?? "-",
        bookTitle,
        borrowedAt: formatReportDate(transaction.tanggal_pinjam),
        dueAt: formatReportDate(transaction.tanggal_jatuh_tempo),
        returnedAt: formatReportDate(transaction.tanggal_kembali),
        statusLabel: status.label,
        statusTone: status.tone,
      });
    });
  });

  return {
    periodLabel: getReportPeriodRange(filters).label,
    summary: {
      totalTransactions: filteredTransactions.length,
      activeTransactions,
      completedTransactions,
      lateTransactions,
      totalBorrowedBooks,
    },
    transactions: rows,
    students: Array.from(studentMap.values())
      .map((item) => ({
        id: item.id,
        studentName: item.studentName,
        className: item.className,
        totalTransactions: item.totalTransactions,
        activeTransactions: item.activeTransactions,
        returnedOnTimeTransactions: item.returnedOnTimeTransactions,
        lateTransactions: item.lateTransactions,
      }))
      .sort((a, b) => b.totalTransactions - a.totalTransactions),
  };
}

export function buildCollectionReport(
  books: AdminCatalogBook[],
  transactions: DetailedTransactionRecord[],
  filters: Pick<
    ReportFilters,
    "collectionPeriod" | "collectionMonth" | "collectionYear"
  >
): CollectionReportData {
  const inventory = books
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author ?? "-",
      activeCopies: book.totalCopies,
      removedCopies: book.removedCount,
    }))
    .sort((first, second) => first.title.localeCompare(second.title, "id-ID"));
  const period = getReportPeriodRange(filters);
  const popularMap = new Map<string, PopularBookReportRow>();

  transactions.forEach((transaction) => {
    const borrowedKey = toDateKey(transaction.tanggal_pinjam);

    if (!isInsideOptionalRange(borrowedKey, period.startDate, period.endDate)) {
      return;
    }

    transaction.items.forEach((item) => {
      const key = item.bookId ? `book:${item.bookId}` : item.title.toLowerCase();
      const current = popularMap.get(key) ?? {
        key,
        rank: 0,
        title: item.title,
        author: item.author ?? "-",
        totalBorrowed: 0,
      };

      current.totalBorrowed += item.quantity;
      popularMap.set(key, current);
    });
  });

  const popular = Array.from(popularMap.values())
    .sort((a, b) => b.totalBorrowed - a.totalBorrowed)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    periodLabel: period.label,
    inventory,
    popular,
  };
}

export function buildAttendanceReport(
  records: AbsensiRecord[],
  filters: Pick<
    ReportFilters,
    | "startDate"
    | "endDate"
    | "collectionPeriod"
    | "collectionMonth"
    | "collectionYear"
  >
): AttendanceReportData {
  const filteredRecords = records.filter((record) => {
    const visitedKey = toDateKey(record.waktu_kunjungan);

    if (!visitedKey) {
      return false;
    }

    return visitedKey >= filters.startDate && visitedKey <= filters.endDate;
  });
  const studentRows: AttendanceReportRow[] = [];
  const publicRows: AttendanceReportRow[] = [];

  filteredRecords.forEach((record) => {
    const row = toAttendanceReportRow(record);

    if (normalizeVisitorType(record.jenis_pengunjung) === "siswa") {
      studentRows.push(row);
    } else {
      publicRows.push(row);
    }
  });

  return {
    periodLabel: getReportPeriodRange(filters).label,
    students: studentRows,
    publicVisitors: publicRows,
  };
}

function toAttendanceReportRow(record: AbsensiRecord): AttendanceReportRow {
  return {
    id: record.id_absensi,
    name: record.nama,
    className: record.kelas_saat_absen?.trim() || "-",
    institution: record.instansi_asal?.trim() || "-",
    purpose: record.tujuan ?? "-",
    visitedAt: formatReportDateTime(record.waktu_kunjungan),
  };
}

function getTotalBooks(transaction: DetailedTransactionRecord) {
  return transaction.items.reduce((total, item) => total + item.quantity, 0);
}

function getReportItems(transaction: DetailedTransactionRecord) {
  if (transaction.items.length > 0) {
    return transaction.items;
  }

  return [
    {
      key: `transaction:${transaction.id_transaksi}`,
      bookId: null,
      copyIds: [],
      title: "-",
      author: null,
      code: null,
      category: null,
      quantity: 0,
      transactionId: transaction.id_transaksi,
    },
  ];
}

function formatBookTitle(title: string, quantity: number) {
  if (quantity > 1) {
    return `${title} (${quantity} eksemplar)`;
  }

  return title;
}

function toDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d{4}-\d{2}-\d{2}/);

  if (match) {
    return match[0];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function formatReportTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatReportDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return `${formatReportDate(value)}, ${formatReportTime(value)}`;
}

function normalizeVisitorType(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function dateFromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(startDateKey: string, endDateKey: string) {
  return Math.round(
    (dateFromDateKey(endDateKey).getTime() -
      dateFromDateKey(startDateKey).getTime()) /
      dayInMs
  );
}

function getTransactionStatus(
  transaction: DetailedTransactionRecord,
  todayKey: string
) {
  const dueKey = toDateKey(transaction.tanggal_jatuh_tempo);
  const returnedKey = toDateKey(transaction.tanggal_kembali);

  if (returnedKey) {
    const daysLate = dueKey ? daysBetween(dueKey, returnedKey) : 0;

    if (daysLate > 0) {
      return {
        daysLate,
        isLate: true,
        label: "Terlambat" as const,
        tone: "amber" as const,
      };
    }

    return {
      daysLate: 0,
      isLate: false,
      label: "Dikembalikan" as const,
      tone: "green" as const,
    };
  }

  if (dueKey) {
    const daysLate = daysBetween(dueKey, todayKey);

    if (daysLate > 0) {
      return {
        daysLate,
        isLate: true,
        label: "Terlambat" as const,
        tone: "red" as const,
      };
    }
  }

  return {
    daysLate: 0,
    isLate: false,
    label: "Dipinjam" as const,
    tone: "blue" as const,
  };
}

function collectStudentSummary(
  studentMap: Map<number, StudentAccumulator>,
  transaction: DetailedTransactionRecord,
  isActive: boolean,
  isLate: boolean
) {
  const id = transaction.siswa?.id_siswa ?? transaction.id_siswa;
  const current = studentMap.get(id) ?? {
    id,
    studentName: transaction.siswa?.nama ?? "Siswa tidak diketahui",
    className: transaction.siswa?.kelas ?? "-",
    totalTransactions: 0,
    activeTransactions: 0,
    returnedOnTimeTransactions: 0,
    lateTransactions: 0,
  };

  current.totalTransactions += 1;

  if (isActive) {
    current.activeTransactions += 1;
  } else if (!isLate) {
    current.returnedOnTimeTransactions += 1;
  }

  if (isLate) {
    current.lateTransactions += 1;
  }

  studentMap.set(id, current);
}

export function getReportPeriodRange(
  filters: Pick<
    ReportFilters,
    "collectionPeriod" | "collectionMonth" | "collectionYear"
  >
) {
  if (filters.collectionPeriod === "all") {
    return {
      label: "Sepanjang waktu",
      startDate: "0001-01-01",
      endDate: "9999-12-31",
    };
  }

  if (filters.collectionPeriod === "yearly") {
    return {
      label: filters.collectionYear,
      startDate: `${filters.collectionYear}-01-01`,
      endDate: `${filters.collectionYear}-12-31`,
    };
  }

  const [year, month] = filters.collectionMonth.split("-").map(Number);
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    label: formatMonthLabel(filters.collectionMonth),
    startDate: `${filters.collectionMonth}-01`,
    endDate: `${filters.collectionMonth}-${String(endDay).padStart(2, "0")}`,
  };
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function isInsideOptionalRange(
  value: string | null,
  startDate: string,
  endDate: string
) {
  if (!value) {
    return false;
  }

  return value >= startDate && value <= endDate;
}
