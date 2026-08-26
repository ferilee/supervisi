# Supervisi — SMKN Pasirian

Aplikasi pengelolaan supervisi pembelajaran dengan tiga tahap: pra-observasi, observasi, serta pasca-observasi. Data produksi disimpan di SQLite melalui backend Node.js; frontend tidak lagi bergantung pada Supabase atau `localStorage` untuk data operasional.

## Pengembangan lokal

```bash
npm install
npm run dev
```

Untuk menjalankan API dan frontend produksi secara lokal:

```bash
npm run build
DATABASE_PATH=./data/supervisi.sqlite npm start
```

Mode browser-only lama dapat digunakan untuk prototipe dengan `VITE_USE_LOCAL_DATA=true` pada `.env.local`. Mode default mengharapkan API SQLite berjalan pada origin yang sama.

## Akun dan hak akses

- Admin: username dan password awal diambil dari `ADMIN_USERNAME` serta `ADMIN_PASSWORD`; default pengembangan adalah `Ferilee` / `F3r!-lee`.
- Supervisor: akun dibuat otomatis saat supervisor ditambahkan. Username memakai nama depan, dengan angka tambahan jika duplikat. Password awal `supervisorsmakenpas` dan wajib diganti.
- Guru: akun dibuat otomatis saat guru ditambahkan. Username memakai nama depan, dengan angka tambahan jika duplikat. Password awal `gurusmakenpas` dan wajib diganti. Guru hanya dapat membaca data miliknya sendiri.

Otorisasi ditegakkan di server, bukan hanya dengan menyembunyikan menu. Sesi memakai cookie HTTP-only dan password disimpan sebagai hash.

## Docker, GHCR, dan Arcane

Workflow [`publish-ghcr.yml`](./.github/workflows/publish-ghcr.yml) dijalankan manual dari GitHub Actions dan menerbitkan `ghcr.io/ferilee/supervisi:latest`. Workflow tidak lagi membutuhkan GitHub Actions Variables Supabase.

Salin `.env.example` menjadi `.env` di server, lalu ubah password admin:

```env
ADMIN_USERNAME=Ferilee
ADMIN_PASSWORD=password-admin-yang-kuat
```

Compose menggunakan SQLite persisten:

```yaml
volumes:
  - /srv/data/supervisi/sqlite:/app/data
```

Di Arcane, gunakan [`compose.yaml`](./compose.yaml), network eksternal `ferileenet`, dan port `2005:2005`. Pada Nginx Proxy Manager, arahkan domain ke hostname container `supervisi` pada port `2005`. Setelah workflow selesai, pull image dan recreate container.

Pastikan direktori host tersedia dan dapat ditulis oleh Docker:

```bash
sudo mkdir -p /srv/data/supervisi/sqlite /srv/backups/supervisi/sqlite
```

## Migrasi data dari browser lama

1. Deploy image SQLite dengan volume baru.
2. Buka aplikasi memakai browser yang menyimpan 74 guru/data lama dan masuk sebagai Admin.
3. Dialog **Pindahkan data browser lama?** akan mengirim guru, supervisor, penilaian, dan pengaturan ke SQLite.
4. Data server dipertahankan jika konflik; data lokal tetap ada sebagai cadangan.
5. Setelah selesai, buka browser lain dan masuk dengan akun backend.

Migrasi idempoten dan memakai `legacy_id`, sehingga dialog aman dijalankan ulang. Jika browser lama tidak lagi tersedia, data dapat diimpor ulang melalui CSV dari halaman Daftar guru.

## Backup SQLite

Jalankan di host Docker:

```bash
./scripts/backup/supervisi-sqlite.sh
```

Script memakai SQLite online backup melalui container dan menyimpan hasil default ke `/srv/backups/supervisi/sqlite`. Uji pemulihan backup secara berkala, jangan hanya mengandalkan file WAL di volume aktif.

## Validasi

```bash
npm test
npm run build
```

Versi ini belum menghitung atau menetapkan Predikat Kinerja resmi. Skor instrumen tetap menjadi bahan penilaian, sedangkan predikat ditetapkan sesuai platform dan ketentuan resmi PKG.
