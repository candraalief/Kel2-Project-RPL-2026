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
    <main className="min-h-screen bg-[linear-gradient(180deg,#d8e7f8_0%,#edf4fb_100%)] lg:h-dvh lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-dvh lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/login-bg.jpeg')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,20,28,0.64),rgba(16,20,28,0.26))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16)_0%,rgba(20,24,30,0.06)_35%,rgba(10,14,20,0.30)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-10 py-6 text-sm text-zinc-700 xl:px-12 xl:py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                SMAN 10 Bogor
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Sistem Informasi Perpustakaan
              </p>
            </div>
          </div>

          <div className="absolute inset-0 flex items-end justify-center px-10 pb-14 xl:px-12 xl:pb-20">
            <div className="max-w-lg rounded-[2rem] border border-white/20 bg-white/10 p-7 backdrop-blur-md xl:max-w-xl xl:p-8">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                Portal institusi
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white xl:text-5xl">
                Akses perpustakaan sekolah dengan satu akun terverifikasi.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-white/80 xl:mt-5 xl:text-base xl:leading-8">
                Akses katalog buku, pantau peminjaman dan pengembalian,
                kelola absensi kunjungan, serta lihat riwayat layanan
                perpustakaan sekolah dalam satu portal terintegrasi.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:h-dvh lg:px-0 lg:py-0">
          <div className="flex w-full justify-center px-2 sm:px-4 lg:px-6">
            <LoginForm
              title="Masuk ke Portal"
              description="Masuk menggunakan akun petugas atau akun siswa yang telah diverifikasi untuk mengakses layanan perpustakaan SMAN 10 Bogor."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
