import { approveSiswaRegistration } from "@/app/actions/auth";

export function ApproveSiswaForm({ siswaId }: { siswaId: number }) {
  const action = approveSiswaRegistration.bind(null, siswaId);

  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-[#145da0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0f4f8a]"
      >
        Setujui akun
      </button>
    </form>
  );
}
