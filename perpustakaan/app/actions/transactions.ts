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
  good: number;
  damaged: number;
  lost: number;
};

const copyIdColumns = ["id_copy", "id_copy_buku", "copy_id", "id_eksemplar", "id"];

async function requireAdminAction() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function isValidCount(value: number) {
  return Number.isInteger(value) && value >= 0;
}

async function updateCopyStatus(
  copyId: number,
  statuses: Array<"tersedia" | "dipinjam" | "hilang" | "dikeluarkan" | "rusak">,
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

async function closeTransaction(transactionId: number, hasLostOrDamaged: boolean) {
  const supabase = getServerSupabaseClient();
  const payloads = [
    {
      tanggal_kembali: new Date().toISOString(),
      status: hasLostOrDamaged ? "selesai_dengan_catatan" : "dikembalikan",
    },
    {
      tanggal_kembali: new Date().toISOString(),
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
  items: ReturnItemInput[]
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
    if (
      !isValidCount(item.good) ||
      !isValidCount(item.damaged) ||
      !isValidCount(item.lost)
    ) {
      return { error: `Jumlah kondisi untuk ${item.title} tidak valid.`, success: "" };
    }

    const total = item.good + item.damaged + item.lost;

    if (total !== item.quantity) {
      return {
        error: `Total kondisi untuk ${item.title} harus sama dengan ${item.quantity} eksemplar.`,
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

  let hasLostOrDamaged = false;

  for (const item of items) {
    const copyQueue = [...item.copyIds];
    const updates: Array<{
      count: number;
      statuses: Array<"tersedia" | "dipinjam" | "hilang" | "dikeluarkan" | "rusak">;
      note: string;
    }> = [
      { count: item.good, statuses: ["tersedia"], note: "" },
      {
        count: item.damaged,
        statuses: ["rusak"],
        note: "Rusak saat pengembalian",
      },
      {
        count: item.lost,
        statuses: ["hilang", "dikeluarkan"],
        note: "Tidak kembali dari peminjam",
      },
    ];

    if (item.damaged > 0 || item.lost > 0) {
      hasLostOrDamaged = true;
    }

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

  if (!(await closeTransaction(transactionId, hasLostOrDamaged))) {
    return {
      error: "Eksemplar berhasil diperbarui, tetapi transaksi gagal ditutup.",
      success: "",
    };
  }

  revalidatePath("/admin/peminjaman");
  revalidatePath("/admin/pengembalian");
  revalidatePath("/siswa/peminjaman");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/admin/buku");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return { error: "", success: "Pengembalian berhasil diproses." };
}
