# 🎓 SiNilai — Aplikasi Pengolahan Nilai Multi-Sekolah

Aplikasi web untuk mengelola **nilai siswa lintas sekolah**, dirancang untuk guru mata pelajaran.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · PostgreSQL (Neon, serverless) · Prisma ORM · Auth JWT (jose + bcryptjs) · ExcelJS · PDFKit

## ✨ Fitur

- **Multi-tenant** — banyak sekolah dalam satu aplikasi; setiap sekolah datanya terpisah (shared DB + `schoolId`, ditegakkan di setiap query & server action)
- **Role & akses** — `ADMIN` global (kelola sekolah, pengguna, field biodata) dan `GURU` (hanya sekolahnya + penugasan miliknya)
- **Master data** — sekolah, kelas/rombel, tahun ajaran (otomatis 1 aktif), mata pelajaran nasional + custom
- **Siswa** — biodata lengkap (NIS, NISN, nama, L/P, tempat/tanggal lahir, kelas, status, angkatan) + **field biodata custom** (tambah tanpa ubah kode: teks, angka, tanggal, pilihan, ya/tidak)
- **Import siswa dari Excel** — download template → isi → upload → **pratinjau & validasi dulu** (NIS duplikat, format tanggal, kelas harus ada) → baru ditulis ke DB
- **Export** — data siswa ke Excel, **leger nilai** ke Excel & **PDF** (siap cetak, dengan kolom tanda tangan)
- **Komponen penilaian fleksibel** — guru bikin komponen sendiri (Tugas, UH, PTS, PAS…), bobot bebas, dinormalisasi otomatis; KKM per sekolah; nilai akhir + keterangan Tuntas/Remedial otomatis
- **Grid input nilai** — keyboard-friendly, nilai 0–100, hitung akhir live, sorot remedial merah

## 🚀 Menjalankan Lokal

```bash
npm install
cp .env.example .env       # isi DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:push            # buat tabel di database (Neon/lokal)
npm run db:seed            # data contoh (admin & guru demo + sekolah + 15 mapel)
npm run dev                # http://localhost:3000
```

Akun demo (dari seed): **admin@sinilai.id / admin123** dan **guru@sinilai.id / guru123**.

`AUTH_SECRET` diisi string acak ≥ 32 karakter: `openssl rand -base64 32`.

## ☁️ Deploy ke Vercel + Neon (gratis)

1. **Neon** (console.neon.tech): buat project → copy 2 connection string:
   - *Pooled* (+ `-pooler`, tambahkan `?pgbouncer=true&sslmode=require`) → `DATABASE_URL`
   - *Direct* → `DIRECT_URL` (dipakai `prisma db push`/migrasi)
2. Push repo ini ke GitHub → **Import** di vercel.com → framework: Next.js (auto).
3. **Environment Variables** di Vercel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (jangan commit `.env`!).
4. Deploy. Setelah sukses pertama, buat tabel & seed — dari komputer lokal:
   ```bash
   DIRECT_URL="...direct..." DATABASE_URL="...direct..." npm run db:push
   DIRECT_URL="...direct..." DATABASE_URL="...direct..." npm run db:seed   # opsional
   ```
   (Seed bersifat opsional untuk produksi; kalau tidak mau data contoh, buat sekolah & akun langsung dari UI sebagai admin pertama — lihat catatan di bawah.)
5. **Pertama kali (tanpa seed):** tabel kosong = belum ada akun → jalankan seed sekali ATAU buat admin via SQL:
   ```sql
   -- Generate hash: npx tsx -e "import('bcryptjs').then(b=>console.log(b.default.hashSync('passwordku',10)))"
   INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
   VALUES (gen_random_uuid()::text, 'Admin', 'admin@sekolahkita.sch.id', '<hash>', 'ADMIN', true, now(), now());
   ```

## 🔐 Catatan keamanan

- Password di-hash bcrypt (10 rounds). Sesi = JWT httpOnly + SameSite=Lax (8 jam), `AUTH_SECRET` wajib.
- Semua mutasi data lewat Server Action/API dengan pengecekan role & kepemilikan (guru hanya penugasan sendiri; siswa/kelas hanya sekolahnya).
- Middleware memblokir route non-publik tanpa token valid + halaman admin khusus.
- Ganti password akun demo segera setelah deploy.

## 🧱 Struktur singkat

```
prisma/schema.prisma   # Multi-tenant: School 1—n ClassRoom/Student/AcademicYear/TeachingAssignment…
src/lib/               # prisma client, session (jose), guards, kalkulasi nilai, excel, pdf, leger
src/server/actions.ts  # Semua Server Action (login, CRUD, validasi, multi-tenant check)
src/app/(app)/         # Halaman: dashboard, siswa, kelas, tahun-ajaran, mapel, penugasan,
                       #          penilaian (grid), rekap (PDF/Excel), field-biodata, users, sekolah
src/app/api/           # scores (bulk simpan nilai), siswa export/template/import, leger export/pdf
```

## 📌 Keputusan desain penting

- **Shared DB + kolom `schoolId`** (bukan schema-per-sekolah): migrasi & query Prisma tetap sederhana, cocok Vercel serverless. Isolasi ditegakkan terpusat.
- **Biodata/nilai fleksibel** via kolom JSONB `extra` + tabel `FieldDefinition`: kolom inti tetap relasional & ter-index; field tambahan dirender dinamis (form/import/export ikut otomatis).
- **Nilai akhir** = `Σ(nilai×bobot) / Σ(bobot komponen terisi)` — valid walau total bobot ≠ 100 (ada peringatan di UI).
- **Tahun ajaran** menempel ke nilai (lewat penugasan), sedangkan "angkatan" menempel ke siswa. Riwayat naik kelas bisa ditambahkan nanti (`Enrollment`) tanpa mengubah data yang ada.
- **Import all-or-nothing per baris**: baris valid diimpor, baris bermasalah/duplikat dilaporkan — tidak ada data setengah-setengah.

## 🛠️ Scripts

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + build produksi |
| `npm run db:push` | Sinkron schema → DB |
| `npm run db:seed` | Isi data contoh |
| `npm run db:studio` | GUI tabel (Prisma Studio) |
