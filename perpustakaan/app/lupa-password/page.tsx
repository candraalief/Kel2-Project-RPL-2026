import { ResetSiswaPasswordForm } from "@/modules/access/ui/reset-siswa-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#d8e7f8_0%,#edf4fb_100%)] px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <ResetSiswaPasswordForm />
      </div>
    </main>
  );
}
