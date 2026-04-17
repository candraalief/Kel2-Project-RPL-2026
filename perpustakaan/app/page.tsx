import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/access/lib/session";
import { LoginForm } from "@/modules/access/ui/login-form";

export default async function Home() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    if (sessionUser.role === "admin") {
      redirect("/admin");
    }

    if (sessionUser.role === "siswa") {
      redirect("/siswa");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#d8e7f8_0%,#edf4fb_100%)]">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/login-bg.jpeg')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,20,28,0.64),rgba(16,20,28,0.26))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16)_0%,rgba(20,24,30,0.06)_35%,rgba(10,14,20,0.30)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-12 py-8 text-sm text-zinc-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                SMAN 10 Bogor
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Sistem Informasi Perpustakaan
              </p>
            </div>
          </div>

          <div className="absolute inset-0 flex items-end justify-center px-12 pb-24">
            <div className="max-w-xl rounded-[2rem] border border-white/20 bg-white/10 p-8 backdrop-blur-md">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                Portal institusi
              </p>
              <h2 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                Akses perpustakaan sekolah dengan satu akun terverifikasi.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/80">
                Admin masuk dengan akun petugas. Siswa mendaftar lebih dulu,
                lalu akun diaktifkan setelah diverifikasi admin perpustakaan.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <LoginForm
            title="Masuk ke Portal"
            description="Masuk ke sistem perpustakaan SMAN 10 Bogor menggunakan akun admin atau akun siswa yang sudah diverifikasi."
          />
        </section>
      </div>
    </main>
  );
}
