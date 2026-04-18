import { clearSiswaPassword } from "@/app/actions/auth";

export function ClearSiswaPasswordForm({ siswaId }: { siswaId: number }) {
  const action = clearSiswaPassword.bind(null, siswaId);

  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
      >
        Kosongkan password
      </button>
    </form>
  );
}
