import { logoutUser } from "@/app/actions/auth";

export function LogoutForm() {
  return (
    <form action={logoutUser}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-950"
      >
        Keluar
      </button>
    </form>
  );
}

