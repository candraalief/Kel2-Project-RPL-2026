import { updateSiswaPassword } from "@/app/actions/auth";

export function UpdateSiswaPasswordForm({ siswaId }: { siswaId: number }) {
  const action = updateSiswaPassword.bind(null, siswaId);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        type="password"
        name="new_password"
        minLength={8}
        required
        placeholder="Password baru siswa"
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#145da0]"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-[#145da0] px-4 py-2 text-sm font-medium text-[#145da0] transition hover:bg-[#f3f8ff]"
      >
        Update password
      </button>
    </form>
  );
}
