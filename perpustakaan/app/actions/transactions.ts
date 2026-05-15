"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/modules/access/lib/session";
import { getCopyTableConfigs } from "@/modules/library/lib/catalog";

export type TransactionActionState = {
  error: string;
  success: string;
};

export type ReturnItemInput = {
  key: string;
  title: string;
  copyIds: number[];
  quantity: number;
  damaged: number;
  lost: number;
};

export type BorrowCartItemInput = {
  bookId: number;
  title: string;
  quantity: number;
};

export type CreateBorrowTransactionInput = {
  idSiswa: number;
  tanggalPinjam: string;
  tanggalJatuhTempo: string;
  catatan?: string;
  items: BorrowCartItemInput[];
};

const copyIdColumns = ["id_copy", "id_copy_buku", "copy_id", "id_eksemplar", "id"];

async function requireAdminAction() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return sessionUser;
}

function isValidCount(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeReturnNote(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 1000);
}

function normalizeBorrowNote(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 1000);
}

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDateTimeLocalInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function parseBorrowDateTime(value: string) {
  if (isDateInput(value)) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (isDateTimeLocalInput(value)) {
    const normalized = value.length === 16 ? `${value}:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildConditionNote(items: ReturnItemInput[]) {
  return items
    .map((item) => {
      const notes = [
        item.damaged > 0 ? `rusak: ${item.damaged}` : "",
        item.lost > 0 ? `hilang: ${item.lost}` : "",
      ].filter(Boolean);

      return notes.length > 0 ? `${item.title}: ${notes.join(", ")}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function combineReturnNotes(adminNote: string, conditionNote: string) {
  const notes = [adminNote, conditionNote].filter(Boolean);

  return notes.length > 0 ? notes.join(" | ") : null;
}

async function updateCopyStatus(
  copyId: number,
  statuses: Array<"tersedia" | "dipinjam" | "dikeluarkan">,
  note: string
) {
  const supabase = getServerSupabaseClient();
  let lastError = "";

  for (const config of getCopyTableConfigs()) {
    for (const idColumn of copyIdColumns) {
      const payloads = statuses.flatMap((status) => [
        {
          [config.statusColumn]: status,
          alasan_dikeluarkan: note || null,
          catatan: note || null,
        },
        {
          [config.statusColumn]: status,
          catatan: note || null,
        },
        {
          [config.statusColumn]: status,
        },
      ]);

      for (const payload of payloads) {
        const { data, error } = await supabase
          .from(config.table)
          .update(payload as never)
          .eq(idColumn, copyId)
          .select(idColumn);

        if (!error && data && data.length > 0) {
          return { error: "", success: true };
        }

        if (error) {
          lastError = error.message;
        }
      }
    }
  }

  return {
    error: lastError || "Eksemplar tidak ditemukan di tabel copy buku.",
    success: false,
  };
}

export async function createBorrowTransaction(
  input: CreateBorrowTransactionInput
): Promise<TransactionActionState & { transactionId?: number }> {
  const sessionUser = await requireAdminAction();

  if (!Number.isInteger(input.idSiswa) || input.idSiswa <= 0) {
    return { error: "Siswa tidak valid.", success: "" };
  }

  const borrowedAt = parseBorrowDateTime(input.tanggalPinjam);
  const dueAt = parseBorrowDateTime(input.tanggalJatuhTempo);

  if (!borrowedAt || !dueAt) {
    return { error: "Tanggal pinjam dan tenggat kembali wajib diisi lengkap.", success: "" };
  }

  if (dueAt.getTime() < borrowedAt.getTime()) {
    return {
      error: "Tenggat kembali tidak boleh lebih awal dari waktu pinjam.",
      success: "",
    };
  }

  const items = input.items
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.bookId) &&
        item.bookId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );

  if (items.length === 0) {
    return { error: "Keranjang peminjaman masih kosong.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  const { data: siswa, error: siswaError } = await supabase
    .from("siswa")
    .select("id_siswa, status_keanggotaan")
    .eq("id_siswa", input.idSiswa)
    .maybeSingle<{ id_siswa: number; status_keanggotaan: string | null }>();

  if (siswaError || !siswa) {
    return { error: "Siswa tidak ditemukan.", success: "" };
  }

  if (siswa.status_keanggotaan !== "aktif") {
    return { error: "Peminjaman hanya bisa dibuat untuk siswa aktif.", success: "" };
  }

  // Atomicity: delegate the entire checkout (allocate copies + insert transaksi + insert detail)
  // to a single Postgres RPC so it's truly all-or-nothing.
  // See: supabase/sql/checkout_peminjaman.sql
  const note = normalizeBorrowNote(input.catatan);
  const grouped = new Map<number, number>();

  for (const item of items) {
    grouped.set(item.bookId, (grouped.get(item.bookId) ?? 0) + item.quantity);
  }

  const payloadItems = Array.from(grouped.entries()).map(([bookId, quantity]) => ({
    bookId,
    quantity,
  }));

  const { data: transactionId, error: rpcError } = await supabase.rpc(
    "checkout_peminjaman",
    {
      p_id_siswa: input.idSiswa,
      p_id_admin: sessionUser.id,
      p_tanggal_pinjam: borrowedAt.toISOString(),
      p_tanggal_jatuh_tempo: dueAt.toISOString(),
      p_catatan: note || null,
      p_items: payloadItems,
    } as never
  );

  if (rpcError) {
    return {
      error:
        rpcError.message ||
        "Gagal checkout peminjaman. Pastikan RPC checkout_peminjaman sudah dibuat di Supabase.",
      success: "",
    };
  }

  const normalizedTransactionId =
    typeof transactionId === "number"
      ? transactionId
      : typeof transactionId === "string" && !Number.isNaN(Number(transactionId))
        ? Number(transactionId)
        : undefined;

  revalidatePath("/admin/buku");
  revalidatePath("/admin/pengembalian");
  revalidatePath("/siswa/peminjaman");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return {
    error: "",
    success: normalizedTransactionId
      ? `Peminjaman berhasil dibuat dengan ID transaksi ${normalizedTransactionId}.`
      : "Peminjaman berhasil dibuat.",
    transactionId: normalizedTransactionId,
  };
}

async function closeTransaction(
  transactionId: number,
  note: string | null
) {
  const supabase = getServerSupabaseClient();
  const closedAt = new Date().toISOString();
  const payloads = [
    {
      tanggal_kembali: closedAt,
      status: "kembali",
      catatan: note,
    },
    {
      tanggal_kembali: closedAt,
      status: "kembali",
    },
    {
      tanggal_kembali: closedAt,
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase
      .from("transaksi")
      .update(payload as never)
      .eq("id_transaksi", transactionId);

    if (!error) {
      return true;
    }
  }

  return false;
}

export async function processTransactionReturn(
  transactionId: number,
  items: ReturnItemInput[],
  note = ""
): Promise<TransactionActionState> {
  await requireAdminAction();

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return { error: "Transaksi tidak valid.", success: "" };
  }

  if (items.length === 0) {
    return {
      error:
        "Detail buku transaksi belum tersedia. Pengembalian aman membutuhkan data item/copy per buku.",
      success: "",
    };
  }

  const supabase = getServerSupabaseClient();
  const { data: transaction, error: transactionError } = await supabase
    .from("transaksi")
    .select("id_transaksi, tanggal_kembali")
    .eq("id_transaksi", transactionId)
    .maybeSingle<{ id_transaksi: number; tanggal_kembali: string | null }>();

  if (transactionError || !transaction) {
    return { error: "Transaksi tidak ditemukan.", success: "" };
  }

  if (transaction.tanggal_kembali) {
    return { error: "Transaksi ini sudah diproses pengembaliannya.", success: "" };
  }

  for (const item of items) {
    if (!isValidCount(item.damaged) || !isValidCount(item.lost)) {
      return { error: `Jumlah kondisi untuk ${item.title} tidak valid.`, success: "" };
    }

    if (item.damaged + item.lost > item.quantity) {
      return {
        error: `Jumlah rusak dan hilang untuk ${item.title} tidak boleh melebihi ${item.quantity} eksemplar.`,
        success: "",
      };
    }

    if (item.copyIds.length < item.quantity) {
      return {
        error: `Transaksi ${item.title} belum menyimpan ID eksemplar lengkap, jadi pengembalian tidak diproses agar data tidak salah.`,
        success: "",
      };
    }
  }

  const adminNote = normalizeReturnNote(note);
  const conditionNote = buildConditionNote(items);
  const returnNote = combineReturnNotes(adminNote, conditionNote);

  for (const item of items) {
    const copyQueue = [...item.copyIds];
    const updates: Array<{
      count: number;
      statuses: Array<"tersedia" | "dipinjam" | "dikeluarkan">;
      note: string;
    }> = [
      {
        count: Math.max(item.quantity - item.lost, 0),
        statuses: ["tersedia"],
        note: "",
      },
      { count: item.lost, statuses: ["dikeluarkan"], note: "Tidak kembali dari peminjam" },
    ];

    for (const update of updates) {
      for (let index = 0; index < update.count; index += 1) {
        const copyId = copyQueue.shift();

        if (!copyId) {
          return {
            error: `ID eksemplar untuk ${item.title} tidak lengkap.`,
            success: "",
          };
        }

        const result = await updateCopyStatus(
          copyId,
          update.statuses,
          update.note
        );

        if (!result.success) {
          return {
            error: `Gagal memperbarui ${item.title}: ${result.error}`,
            success: "",
          };
        }
      }
    }
  }

  if (
    !(await closeTransaction(
      transactionId,
      returnNote
    ))
  ) {
    return {
      error: "Eksemplar berhasil diperbarui, tetapi transaksi gagal ditutup.",
      success: "",
    };
  }

  revalidatePath("/admin/pengembalian");
  revalidatePath("/siswa/peminjaman");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/admin/buku");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return { error: "", success: "Pengembalian berhasil diproses." };
}
