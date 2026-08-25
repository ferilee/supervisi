# Supervisi — SMKN Pasirian

MVP aplikasi interaktif untuk instrumen supervisi pembelajaran:

- Telaah RPP / Modul Ajar pra-observasi
- Observasi pembelajaran
- Refleksi, umpan balik, dan tindak lanjut pasca-observasi
- Rekap guru dan cetak laporan melalui **Cetak / Simpan sebagai PDF** di browser

## Menjalankan

```bash
npm install
npm run dev
```

Tanpa environment backend, aplikasi berjalan dalam mode lokal dengan `localStorage`. Salin [`.env.example`](./.env.example) menjadi `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, lalu login akan memakai Supabase Auth dan seluruh data operasional akan dimuat dari Supabase. Jalankan [`supabase/schema.sql`](./supabase/schema.sql) di SQL Editor Supabase untuk membuat tabel serta policy RLS berbasis peran.

Ketika Supabase aktif, backend menjadi sumber data utama dan aplikasi tidak menggunakan `localStorage` sebagai fallback jika koneksi gagal. Jika browser lama memiliki data lokal, Admin akan mendapat dialog migrasi satu kali untuk menggabungkan guru, supervisor, penilaian, dan pengaturan ke Supabase tanpa duplikasi. Data server dipertahankan jika terjadi konflik dan data lokal tetap tersimpan sebagai cadangan.

Role yang didukung: Admin memiliki akses penuh; Supervisor dapat mengelola penilaian dan laporan tetapi tidak melihat halaman Supervisor/Pengaturan; Guru hanya melihat data penilaiannya sendiri dalam mode baca saja. Password tidak disimpan di Postgres—penggantian password memakai Supabase Auth.

Untuk aktivasi produksi, buat user di Supabase Auth lalu tambahkan baris pasangannya di `profiles`. Admin memakai username `Ferilee`; akun supervisor memakai nama depan sebagai username dan `must_change_password = true`. Pembuatan akun Auth supervisor/guru sebaiknya dilakukan melalui Edge Function dengan service role key, bukan dari browser.

## Docker dan GHCR

Workflow [`publish-ghcr.yml`](./.github/workflows/publish-ghcr.yml) dijalankan manual dari GitHub Actions dan menerbitkan `ghcr.io/ferilee/supervisi:latest`. Tambahkan GitHub Actions Variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sebelum menjalankan workflow. Compose production tersedia di [`compose.yaml`](./compose.yaml) dan menggunakan network eksternal `ferileenet` serta port host `2005`. Karena aplikasi ini frontend Vite yang dilayani Nginx, konfigurasi `VITE_*` masuk saat image dibuild; environment Compose tidak mengganti konfigurasi yang sudah berada di bundle.

## Validasi

```bash
npm test
npm run build
```

Versi ini sengaja tidak menghitung Predikat Kinerja resmi. Skor instrumen ditampilkan sebagai skor total dan rata-rata, sedangkan penetapan predikat tetap dilakukan sesuai platform dan ketentuan resmi PKG.
