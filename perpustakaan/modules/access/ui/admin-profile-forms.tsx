"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null);
  const sortedAdmins = useMemo(
    () => [...admins].sort((a, b) => a.id - b.id),
    [admins]
  );

  function openDetail(target: AdminProfile) {
    setSelectedAdmin(target);
    setModalMode("detail");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedAdmin(null);
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
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

        <div className="overflow-x-auto">
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
              className="flex w-full items-center justify-center gap-3 border-t border-dashed border-[#b9d3ff] bg-[#eef5ff] px-5 py-5 text-sm font-semibold text-[#0f5fc4] transition hover:bg-[#e3efff] disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
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
        />
      ) : null}

      {modalMode === "add" ? (
        <AddAdminModal
          supportsEmail={admin.supportsEmail}
          supportsNomorTelephone={admin.supportsNomorTelephone}
          onClose={closeModal}
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
}: {
  admin: AdminProfile;
  currentAdminId: number;
  canManageAdmins: boolean;
  onClose: () => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateAdminAccount,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAdminAccount,
    initialState
  );
  const canDelete = canManageAdmins && admin.id !== 0 && admin.id !== currentAdminId;

  return (
    <Modal title="Detail Admin" onClose={onClose}>
      <form action={updateAction} className="space-y-4">
        <input type="hidden" name="admin_id" value={admin.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nama Lengkap"
            name="nama"
            defaultValue={admin.nama}
            placeholder="Masukkan nama lengkap"
            required
            disabled={!canManageAdmins}
          />
          <Field
            label="Username"
            name="username"
            defaultValue={admin.username}
            placeholder="Masukkan username"
            required
            disabled={!canManageAdmins}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={admin.email}
            placeholder="admin@sekolah.sch.id"
            disabled={!canManageAdmins || !admin.supportsEmail}
          />
          <Field
            label="Nomor Telephone"
            name="nomor_telephone"
            defaultValue={admin.nomorTelephone}
            placeholder="08xxxxxxxxxx"
            disabled={!canManageAdmins || !admin.supportsNomorTelephone}
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
          <p>ID Admin: {admin.id}</p>
          <p>
            Status:{" "}
            {admin.id === 0 ? "Superadmin" : "Admin perpustakaan"}
          </p>
          <p>Password lama tidak ditampilkan karena tersimpan sebagai hash.</p>
        </div>

        <SchemaNote
          supportsEmail={admin.supportsEmail}
          supportsNomorTelephone={admin.supportsNomorTelephone}
        />
        <FormStatus state={updateState} />

        <div className="flex flex-wrap justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={!canManageAdmins || updatePending}
            className="inline-flex min-w-36 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {updatePending ? "Menyimpan..." : "Simpan Edit"}
          </button>
        </div>
      </form>

      <form
        action={deleteAction}
        className="mt-4 border-t border-zinc-200 pt-4"
        onSubmit={(event) => {
          if (!window.confirm(`Hapus akun admin "${admin.nama}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="admin_id" value={admin.id} />
        <FormStatus state={deleteState} />
        <button
          type="submit"
          disabled={!canDelete || deletePending}
          className="inline-flex min-w-36 items-center justify-center rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {deletePending ? "Menghapus..." : "Hapus Admin"}
        </button>
        {!canDelete ? (
          <p className="mt-2 text-sm text-zinc-500">
            Superadmin dan akun session saat ini tidak bisa dihapus.
          </p>
        ) : null}
      </form>
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
          className="inline-flex min-w-40 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {pending ? "Menambahkan..." : "Tambah Akun"}
        </button>
      </form>
    </Modal>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-2xl">
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
  type?: string;
  required?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  type = "text",
  required = false,
  disabled = false,
}: FieldProps) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-zinc-800">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        placeholder={disabled ? "Tidak tersedia" : placeholder}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
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
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Kolom email atau nomor telephone belum tersedia di tabel admin, jadi field
      tersebut dinonaktifkan tanpa mengganggu data utama.
    </p>
  );
}

function FormStatus({ state }: { state: AdminProfileState }) {
  return (
    <>
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
    </>
  );
}
