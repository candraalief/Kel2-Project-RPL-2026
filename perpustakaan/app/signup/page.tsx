import Link from "next/link";
import { SignupForm } from "@/modules/access/ui/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ece8e1_0%,#dde6ea_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c1322]">
              SMAN 10 Bogor
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Pendaftaran akun siswa perpustakaan
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900"
          >
            Kembali ke halaman masuk
          </Link>
        </header>

        <SignupForm />
      </div>
    </main>
  );
}
