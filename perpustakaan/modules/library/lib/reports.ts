import type { AbsensiRecord, DetailedTransactionRecord } from "./data";

export type ReportType = "transaksi" | "absensi";
export type ReportFormat = "pdf" | "excel";
export type TransactionReportTab = "transaksi" | "siswa" | "buku";
export type AttendanceReportTab = "siswa" | "umum";

export type ReportFilters = {
  type: ReportType;
  format: ReportFormat;
  startDate: string;
  endDate: string;
  tab: TransactionReportTab;
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
  nisn: string;
  className: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string;
  totalBooks: number;
  booksText: string;
  statusLabel: string;
  statusTone: "blue" | "green" | "red" | "amber";
  deadlineLabel: string;
  note: string;
};

export type StudentTransactionReportRow = {
  id: number;
  studentName: string;
  nisn: string;
  className: string;
  totalTransactions: number;
  activeTransactions: number;
  returnedOnTimeTransactions: number;
  returnedLateTransactions: number;
};

export type BorrowedBookReportRow = {
  key: string;
  title: string;
  author: string;
  totalBorrowed: number;
  lostCopies: number;
};

export type TransactionReportData = {
  periodLabel: string;
  summary: TransactionReportSummary;
  transactions: TransactionReportRow[];
  students: StudentTransactionReportRow[];
  books: BorrowedBookReportRow[];
};

export type AttendanceReportRow = {
  id: number;
  name: string;
  purpose: string;
  date: string;
  time: string;
};

export type AttendanceReportData = {
  periodLabel: string;
  students: AttendanceReportRow[];
  publicVisitors: AttendanceReportRow[];
};

type StudentAccumulator = {
  id: number;
  studentName: string;
  nisn: string;
  className: string;
  totalTransactions: number;
  activeTransactions: number;
  returnedOnTimeTransactions: number;
  returnedLateTransactions: number;
};

type BookAccumulator = {
  key: string;
  bookId: number | null;
  title: string;
  author: string;
  totalBorrowed: number;
  lostCopies: number;
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

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeReportDate(value: string, fallback: string) {
  return isDateKey(value) ? value : fallback;
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
  filters: Pick<ReportFilters, "startDate" | "endDate">
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
  const bookMap = new Map<string, BookAccumulator>();
  let activeTransactions = 0;
  let completedTransactions = 0;
  let lateTransactions = 0;
  let totalBorrowedBooks = 0;

  const rows = filteredTransactions.map((transaction) => {
    const totalBooks = getTotalBooks(transaction);
    const status = getTransactionStatus(transaction, todayKey);
    const isActive = !transaction.tanggal_kembali;
    const isLate = status.isLate;

    totalBorrowedBooks += totalBooks;

    if (isActive) {
      activeTransactions += 1;
    } else {
      completedTransactions += 1;
    }

    if (isLate) {
      lateTransactions += 1;
    }

    collectStudentSummary(
      studentMap,
      transaction,
      isActive,
      isLate
    );
    collectBookSummary(bookMap, transaction);

    return {
      id: transaction.id_transaksi,
      studentName: transaction.siswa?.nama ?? "Siswa tidak diketahui",
      nisn: transaction.siswa?.nisn ?? "-",
      className: transaction.siswa?.kelas ?? "-",
      borrowedAt: formatReportDate(transaction.tanggal_pinjam),
      dueAt: formatReportDate(transaction.tanggal_jatuh_tempo),
      returnedAt: formatReportDate(transaction.tanggal_kembali),
      totalBooks,
      booksText: transaction.items.length
        ? transaction.items
            .map((item) => `${item.title} (${item.quantity})`)
            .join(", ")
        : "-",
      statusLabel: status.label,
      statusTone: status.tone,
      deadlineLabel: getDeadlineLabel(transaction, todayKey),
      note: transaction.catatan?.trim() || "-",
    };
  });

  return {
    periodLabel: `${formatReportDate(filters.startDate)} - ${formatReportDate(filters.endDate)}`,
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
        nisn: item.nisn,
        className: item.className,
        totalTransactions: item.totalTransactions,
        activeTransactions: item.activeTransactions,
        returnedOnTimeTransactions: item.returnedOnTimeTransactions,
        returnedLateTransactions: item.returnedLateTransactions,
      }))
      .sort((a, b) => b.totalTransactions - a.totalTransactions),
    books: Array.from(
      collectLostBookSummaries(
        bookMap,
        transactions,
        filters
      ).values()
    )
      .map((item) => ({
        key: item.key,
        title: item.title,
        author: item.author,
        totalBorrowed: item.totalBorrowed,
        lostCopies: item.lostCopies,
      }))
      .sort((a, b) => b.totalBorrowed - a.totalBorrowed || b.lostCopies - a.lostCopies),
  };
}

export function buildAttendanceReport(
  records: AbsensiRecord[],
  filters: Pick<ReportFilters, "startDate" | "endDate">
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
    periodLabel: `${formatReportDate(filters.startDate)} - ${formatReportDate(filters.endDate)}`,
    students: studentRows,
    publicVisitors: publicRows,
  };
}

function toAttendanceReportRow(record: AbsensiRecord): AttendanceReportRow {
  return {
    id: record.id_absensi,
    name: record.nama,
    purpose: record.tujuan ?? "-",
    date: formatReportDate(record.waktu_kunjungan),
    time: formatReportTime(record.waktu_kunjungan),
  };
}

function getTotalBooks(transaction: DetailedTransactionRecord) {
  return transaction.items.reduce((total, item) => total + item.quantity, 0);
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

function normalizeVisitorType(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function dateFromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(startDateKey: string, endDateKey: string) {
  return Math.round(
    (dateFromDateKey(endDateKey).getTime() - dateFromDateKey(startDateKey).getTime()) /
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
    const lateDays = dueKey ? daysBetween(dueKey, returnedKey) : 0;

    if (lateDays > 0) {
      return {
        isLate: true,
        label: "Dikembalikan terlambat",
        tone: "amber" as const,
      };
    }

    return {
      isLate: false,
      label: "Dikembalikan",
      tone: "green" as const,
    };
  }

  if (dueKey && daysBetween(dueKey, todayKey) > 0) {
    return {
      isLate: true,
      label: "Terlambat",
      tone: "red" as const,
    };
  }

  return {
    isLate: false,
    label: "Aktif",
    tone: "blue" as const,
  };
}

function getDeadlineLabel(
  transaction: DetailedTransactionRecord,
  todayKey: string
) {
  const dueKey = toDateKey(transaction.tanggal_jatuh_tempo);
  const returnedKey = toDateKey(transaction.tanggal_kembali);

  if (!dueKey) {
    return "-";
  }

  if (returnedKey) {
    const lateDays = daysBetween(dueKey, returnedKey);

    if (lateDays > 0) {
      return `Dikembalikan terlambat ${lateDays} hari`;
    }

    return "Dikembalikan tepat waktu";
  }

  const distance = daysBetween(todayKey, dueKey);

  if (distance === 0) {
    return `Kembali hari ini, ${formatReportDate(dueKey)}`;
  }

  if (distance > 0) {
    return `Kembali ${formatReportDate(dueKey)} - ${distance} hari lagi`;
  }

  return `Lewat ${Math.abs(distance)} hari dari ${formatReportDate(dueKey)}`;
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
    nisn: transaction.siswa?.nisn ?? "-",
    className: transaction.siswa?.kelas ?? "-",
    totalTransactions: 0,
    activeTransactions: 0,
    returnedOnTimeTransactions: 0,
    returnedLateTransactions: 0,
  };

  current.totalTransactions += 1;

  if (isActive) {
    current.activeTransactions += 1;
  } else if (isLate) {
    current.returnedLateTransactions += 1;
  } else {
    current.returnedOnTimeTransactions += 1;
  }

  studentMap.set(id, current);
}

function collectBookSummary(
  bookMap: Map<string, BookAccumulator>,
  transaction: DetailedTransactionRecord
) {
  transaction.items.forEach((item) => {
    const current = getBookAccumulator(bookMap, item);

    current.totalBorrowed += item.quantity;
  });
}

function collectLostBookSummaries(
  bookMap: Map<string, BookAccumulator>,
  transactions: DetailedTransactionRecord[],
  filters: Pick<ReportFilters, "startDate" | "endDate">
) {
  transactions.forEach((transaction) => {
    const returnedKey = toDateKey(transaction.tanggal_kembali);

    if (
      !returnedKey ||
      returnedKey < filters.startDate ||
      returnedKey > filters.endDate
    ) {
      return;
    }

    transaction.items.forEach((item) => {
      const lostCopies = getLostCopiesForItem(transaction, item.title);

      if (lostCopies <= 0) {
        return;
      }

      const current = getBookAccumulator(bookMap, item);
      current.lostCopies += lostCopies;
    });
  });

  return bookMap;
}

function getBookAccumulator(
  bookMap: Map<string, BookAccumulator>,
  item: DetailedTransactionRecord["items"][number]
) {
  const key = item.bookId ? `book:${item.bookId}` : item.title.toLowerCase();
  const current = bookMap.get(key) ?? {
    key,
    bookId: item.bookId,
    title: item.title,
    author: item.author ?? "-",
    totalBorrowed: 0,
    lostCopies: 0,
  };

  bookMap.set(key, current);

  return current;
}

function getLostCopiesForItem(
  transaction: DetailedTransactionRecord,
  title: string
) {
  const note = transaction.catatan ?? "";
  const segments = note
    .split(/[|;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalizedTitle = title.toLowerCase();
  const itemSegment = segments.find((segment) =>
    segment.toLowerCase().startsWith(`${normalizedTitle}:`)
  );

  if (!itemSegment) {
    return 0;
  }

  const lostMatch =
    itemSegment.match(/hilang\s*:\s*(\d+)/i) ??
    itemSegment.match(/(\d+)\s+hilang/i);

  return lostMatch?.[1] ? Number(lostMatch[1]) : 0;
}
