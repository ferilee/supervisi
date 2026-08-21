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

Data guru dan penilaian draf disimpan di `localStorage` agar aplikasi dapat langsung dicoba tanpa konfigurasi server. Skema cloud-ready tersedia di [`supabase/schema.sql`](./supabase/schema.sql). Untuk deployment sekolah, fase berikutnya dapat mengganti adapter penyimpanan dengan Supabase Auth + Postgres dan menambahkan policy RLS berbasis peran.

## Validasi

```bash
npm test
npm run build
```

Versi ini sengaja tidak menghitung Predikat Kinerja resmi. Skor instrumen ditampilkan sebagai skor total dan rata-rata, sedangkan penetapan predikat tetap dilakukan sesuai platform dan ketentuan resmi PKG.
