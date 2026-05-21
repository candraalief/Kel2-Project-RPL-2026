# Setup Kiosk Perpustakaan

Folder ini berisi launcher Windows untuk membuka aplikasi dalam mode kiosk Chrome.

## File

- `perpustakaan-kiosk.cmd`: membuka halaman utama aplikasi dalam mode kiosk.

Launcher memakai profil Chrome khusus:

- `%LocalAppData%\PerpustakaanKiosk\App`

Dari halaman utama, petugas bisa masuk sebagai admin atau membuka mode publik dengan password.

Logo sekolah untuk tampilan awal kiosk dibaca dari:

```text
public/sman10-logo.png
```

## Cara Pakai

1. Pastikan aplikasi berjalan atau sudah deploy.
2. Buka file `.cmd`, lalu sesuaikan `BASE_URL` jika bukan `http://localhost:3000`.
3. Double click `perpustakaan-kiosk.cmd`.

Contoh jika aplikasi sudah online:

```cmd
set "BASE_URL=https://alamat-aplikasi-kamu.com"
```

## Shortcut Desktop

1. Klik kanan file `.cmd`.
2. Pilih `Send to > Desktop (create shortcut)`.
3. Ubah nama shortcut menjadi `Kiosk Perpustakaan`.

## Jalan Otomatis Saat Komputer Menyala

1. Tekan `Win + R`.
2. Ketik `shell:startup`.
3. Masukkan shortcut kiosk yang ingin otomatis terbuka.

## Keluar Dari Kiosk

Gunakan `Alt + F4` di keyboard.
