"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  createAdminAccount,
  deleteAdminAccount,
  updateAdminAccount,
  type AdminProfileState,
} from "@/app/actions/auth";
import type { AdminProfile } from "@/modules/access/lib/admin-profile";

const initialState: AdminProfileState = {
  error: "",
  success: "",
};

type ModalMode = "detail" | "add";

export function AdminProfileForms({
  admin,
  admins,
  totalAdmin,
  totalSiswa,
  canManageAdmins,
}: {
  admin: AdminProfile;
  admins: AdminProfile[];
  totalAdmin: number;
  totalSiswa: number;
  canManageAdmins: boolean;
}) {
  const [localAdmins, setLocalAdmins] = useState(admins);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [deleteNotice, setDeleteNotice] = useState(false);
  const sortedAdmins = useMemo(
    () => [...localAdmins].sort((a, b) => a.id - b.id),
    [localAdmins]
  );

  useEffect(() => {
    if (!deleteNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDeleteNotice(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [deleteNotice]);

  function openDetail(target: AdminProfile) {
    setSelectedAdmin(target);
    setModalMode("detail");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedAdmin(null);
  }

  function updateAdminProfile(updatedAdmin: AdminProfile) {
    setLocalAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === updatedAdmin.id ? updatedAdmin : item
      )
    );
    setSelectedAdmin(updatedAdmin);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Admin aktif" value={totalAdmin} />
        <SummaryCard label="Anggota siswa" value={totalSiswa} />
        <SummaryCard
          label="Akses session"
          value={canManageAdmins ? "Superadmin" : "Admin"}
        />
      </section>

      {!canManageAdmins ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data admin bisa dilihat, tetapi tambah, edit, dan hapus hanya bisa
          dilakukan oleh session superadmin Perpustakaan SMAN 10 Bogor.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Admin Profile
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              Daftar Admin
            </h2>
          </div>
          <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-semibold text-[#0f5fc4]">
            {sortedAdmins.length} akun
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_130px] bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <span>ID</span>
              <span>Nama</span>
              <span>Username</span>
              <span>Email</span>
              <span>Aksi</span>
            </div>

            {sortedAdmins.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDetail(item)}
                className="grid w-full grid-cols-[80px_1fr_1fr_1fr_130px] items-center border-t border-zinc-200 px-5 py-4 text-left text-sm text-zinc-600 transition hover:bg-[#f6faff]"
              >
                <span className="font-semibold text-zinc-950">{item.id}</span>
                <span className="min-w-0 truncate font-medium text-zinc-950">
                  {item.nama || "-"}
                </span>
                <span className="min-w-0 truncate">{item.username || "-"}</span>
                <span className="min-w-0 truncate">
                  {item.supportsEmail ? item.email || "-" : "Belum ada kolom"}
                </span>
                <span>
                  <span className="inline-flex rounded-lg border border-[#b9d3ff] px-3 py-2 text-xs font-semibold text-[#0f5fc4]">
                    Detail
                  </span>
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => canManageAdmins && setModalMode("add")}
              disabled={!canManageAdmins}
            className="flex min-h-[44px] w-full items-center justify-center gap-3 border-t border-dashed border-[#b9d3ff] bg-[#eef5ff] px-5 py-5 text-sm font-semibold text-[#0f5fc4] transition hover:bg-[#e3efff] disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <span className="text-2xl leading-none">+</span>
              Tambah Admin
            </button>
          </div>
        </div>
      </section>

      {modalMode === "detail" && selectedAdmin ? (
        <AdminDetailModal
          admin={selectedAdmin}
          currentAdminId={admin.id}
          canManageAdmins={canManageAdmins}
          onClose={closeModal}
          onUpdated={updateAdminProfile}
          onDelete={() => setDeleteTarget(selectedAdmin)}
        />
      ) : null}

      {modalMode === "add" ? (
        <AddAdminModal
          supportsEmail={admin.supportsEmail}
          supportsNomorTelephone={admin.supportsNomorTelephone}
          onClose={closeModal}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteAdminModal
          admin={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            closeModal();
            setDeleteNotice(true);
          }}
        />
      ) : null}

      {deleteNotice ? (
        <ActionToast
          message="Admin berhasil dihapus"
          onClose={() => setDeleteNotice(false)}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function AdminDetailModal({
  admin,
  currentAdminId,
  canManageAdmins,
  onClose,
  onUpdated,
  onDelete,
}: {
  admin: AdminProfile;
  currentAdminId: number;
  canManageAdmins: boolean;
  onClose: () => void;
  onUpdated: (admin: AdminProfile) => void;
  onDelete: () => void;
}) {
  const [fields, setFields] = useState(admin);
  const [updateState, updateAction, updatePending] = useActionState(async (
    prevState: AdminProfileState | undefined,
    formData: FormData
  ) => {
    const nextState = await updateAdminAccount(prevState, formData);

    if (nextState.profile) {
      setFields(nextState.profile);
      onUpdated(nextState.profile);
    }

    return nextState;
  }, initialState);
  const canDelete = canManageAdmins && admin.id !== 0 && admin.id !== currentAdminId;

  function updateField(
    field: "nama" | "username" | "email" | "nomorTelephone",
    value: string
  ) {
    setFields((currentFields) => ({
      ...currentFields,
      [field]: value,
    }));
  }

  return (
    <Modal title="Detail Admin" onClose={onClose}>
      <form action={updateAction} className="space-y-4">
        <input type="hidden" name="admin_id" value={fields.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nama Lengkap"
            name="nama"
            value={fields.nama}
            onChange={(value) => updateField("nama", value)}
            placeholder="Masukkan nama lengkap"
            required
            disabled={!canManageAdmins}
          />
          <Field
            label="Username"
            name="username"
            value={fields.username}
            onChange={(value) => updateField("username", value)}
            placeholder="Masukkan username"
            required
            disabled={!canManageAdmins}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={fields.email}
            onChange={(value) => updateField("email", value)}
            placeholder="admin@sekolah.sch.id"
            disabled={!canManageAdmins || !fields.supportsEmail}
          />
          <Field
            label="Nomor Telephone"
            name="nomor_telephone"
            value={fields.nomorTelephone}
            onChange={(value) => updateField("nomorTelephone", value)}
            placeholder="08xxxxxxxxxx"
            disabled={!canManageAdmins || !fields.supportsNomorTelephone}
          />
          <Field
            label="Password Baru"
            name="password"
            type="password"
            placeholder="Kosongkan jika tidak diganti"
            disabled={!canManageAdmins}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <p>ID Admin: {fields.id}</p>
          <p>
            Status:{" "}
            {fields.id === 0 ? "Superadmin" : "Admin perpustakaan"}
          </p>
          <p>Password lama tidak ditampilkan karena tersimpan sebagai hash.</p>
        </div>

        <SchemaNote
          supportsEmail={fields.supportsEmail}
          supportsNomorTelephone={fields.supportsNomorTelephone}
        />
        <FormStatus state={updateState} />

        <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row">
          <button
            type="submit"
            disabled={!canManageAdmins || updatePending}
            className="inline-flex min-h-[44px] w-full min-w-36 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          >
            {updatePending ? "Menyimpan..." : "Simpan Edit"}
          </button>
        </div>
      </form>

      <div className="mt-4 border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="inline-flex min-h-[44px] w-full min-w-36 items-center justify-center rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
        >
          Hapus Admin
        </button>
        {!canDelete ? (
          <p className="mt-2 text-sm text-zinc-500">
            Superadmin dan akun session saat ini tidak bisa dihapus.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function AddAdminModal({
  supportsEmail,
  supportsNomorTelephone,
  onClose,
}: {
  supportsEmail: boolean;
  supportsNomorTelephone: boolean;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createAdminAccount,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Modal title="Tambah Admin" onClose={onClose}>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nama Lengkap"
            name="nama"
            placeholder="Masukkan nama lengkap"
            required
          />
          <Field
            label="Username"
            name="username"
            placeholder="Masukkan username"
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="admin@sekolah.sch.id"
            disabled={!supportsEmail}
          />
          <Field
            label="Nomor Telephone"
            name="nomor_telephone"
            placeholder="08xxxxxxxxxx"
            disabled={!supportsNomorTelephone}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="Minimal 8 karakter"
            required
          />
        </div>

        <SchemaNote
          supportsEmail={supportsEmail}
          supportsNomorTelephone={supportsNomorTelephone}
        />
        <FormStatus state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] w-full min-w-40 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
        >
          {pending ? "Menambahkan..." : "Tambah Akun"}
        </button>
      </form>
    </Modal>
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
        x
      </button>
    </div>
  );
}

function DangerConfirmModal({
  title,
  description,
  children,
  error,
  isPending,
  confirmDisabled,
  confirmLabel,
  pendingLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  children: ReactNode;
  error: string;
  isPending: boolean;
  confirmDisabled?: boolean;
  confirmLabel: string;
  pendingLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 py-4"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Tutup"
          >
            x
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
            className="inline-flex h-11 w-full min-w-24 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
            className="inline-flex h-11 w-full min-w-24 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteAdminModal({
  admin,
  onClose,
  onSuccess,
}: {
  admin: AdminProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const canConfirm = confirmationText.trim().toLowerCase() === "hapus admin";

  function handleDelete() {
    if (!canConfirm) {
      setError('Ketik "hapus admin" untuk mengonfirmasi penghapusan.');
      return;
    }

    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("admin_id", String(admin.id));

      try {
        const state = await deleteAdminAccount(undefined, formData);

        if (state.error) {
          setError(state.error);
          return;
        }

        onSuccess();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Gagal menghapus admin."
        );
      }
    });
  }

  return (
    <DangerConfirmModal
      title="Hapus Admin"
      description='Ketik "hapus admin" untuk menghapus akun admin ini dari sistem.'
      error={error}
      isPending={isPending}
      confirmDisabled={!canConfirm}
      confirmLabel="Hapus"
      pendingLabel="Menghapus..."
      onClose={onClose}
      onConfirm={handleDelete}
    >
      <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-zinc-950">
        <p>
          Nama: <span className="font-semibold">{admin.nama || "-"}</span>
        </p>
        <p className="mt-2">
          Username:{" "}
          <span className="font-semibold">{admin.username || "-"}</span>
        </p>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-semibold text-zinc-800">
          Konfirmasi
        </span>
        <input
          value={confirmationText}
          onChange={(event) => {
            setConfirmationText(event.currentTarget.value);
            setError("");
          }}
          disabled={isPending}
          placeholder="ketik : hapus admin"
          className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-red-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
        />
      </label>
    </DangerConfirmModal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/40 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Admin Profile
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-xl text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950"
            aria-label="Tutup modal"
          >
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: FieldProps) {
  const controlledProps =
    value === undefined
      ? { defaultValue }
      : {
          value,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChange?.(event.currentTarget.value),
        };

  return (
    <label className="min-w-0 space-y-2">
      <span className="text-sm font-semibold text-zinc-800">{label}</span>
      <input
        name={name}
        type={type}
        {...controlledProps}
        required={required}
        disabled={disabled}
        placeholder={disabled ? "Tidak tersedia" : placeholder}
        className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      />
    </label>
  );
}

function SchemaNote({
  supportsEmail,
  supportsNomorTelephone,
}: {
  supportsEmail: boolean;
  supportsNomorTelephone: boolean;
}) {
  if (supportsEmail && supportsNomorTelephone) {
    return null;
  }

  return (
    <p className="break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Kolom email atau nomor telephone belum tersedia di tabel admin, jadi field
      tersebut dinonaktifkan tanpa mengganggu data utama.
    </p>
  );
}

function FormStatus({ state }: { state: AdminProfileState }) {
  return (
    <>
      {state.error ? (
        <p className="break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="break-words rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
    </>
  );
}
