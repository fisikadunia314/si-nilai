/**
 * Seed SiNilai — 1 sekolah contoh, 1 admin global, 1 guru, master mapel,
 * tahun ajaran aktif, 1 kelas, 10 siswa, 1 penugasan demo + komponennya.
 * Aman dijalankan berkali-kali (upsert).
 *
 *   npm run db:seed
 */
import { PrismaClient, Semester, Role, Gender, StudentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUBJECTS: Array<[string, string]> = [
  ["MAT", "Matematika"], ["BIN", "Bahasa Indonesia"], ["BIG", "Bahasa Inggris"],
  ["FIS", "Fisika"], ["KIM", "Kimia"], ["BIO", "Biologi"],
  ["SEJ", "Sejarah"], ["PPK", "PPKn"], ["EKO", "Ekonomi"], ["GEO", "Geografi"],
  ["SOS", "Sosiologi"], ["PAB", "Pendidikan Agama Islam"], ["PJK", "PJOK"],
  ["SDB", "Seni Budaya"], ["INF", "Informatika"],
];

async function main() {
  console.log("🌱 Seeding SiNilai...");

  // 1) Master mapel
  for (const [code, name] of SUBJECTS) {
    await prisma.subject.upsert({ where: { code }, update: { name }, create: { code, name } });
  }

  // 2) Contoh sekolah
  const school = await prisma.school.upsert({
    where: { npsn: "12345678" },
    update: {},
    create: { name: "SMA Negeri 1 Contoh", npsn: "12345678", jenjang: "SMA", city: "Jakarta", address: "Jl. Pendidikan No. 1", passingGrade: 75 },
  });

  // 3) Akun
  const adminPass = await bcrypt.hash("admin123", 10);
  const guruPass = await bcrypt.hash("guru123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sinilai.id" },
    update: {},
    create: { name: "Administrator", email: "admin@sinilai.id", passwordHash: adminPass, role: Role.ADMIN, schoolId: null },
  });
  const guru = await prisma.user.upsert({
    where: { email: "guru@sinilai.id" },
    update: {},
    create: { name: "Budi Santoso, S.Pd.", email: "guru@sinilai.id", passwordHash: guruPass, role: Role.GURU, schoolId: school.id },
  });

  // 4) Tahun ajaran aktif
  const tahunAjaran = await prisma.academicYear.upsert({
    where: { schoolId_year_semester: { schoolId: school.id, year: "2026/2027", semester: Semester.GANJIL } },
    update: { isActive: true },
    create: { schoolId: school.id, year: "2026/2027", semester: Semester.GANJIL, isActive: true },
  });

  // 5) Kelas + siswa contoh
  const kelas = await prisma.classRoom.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "XI IPA 1" } },
    update: {},
    create: { schoolId: school.id, name: "XI IPA 1", gradeLevel: "XI" },
  });

  const siswaContoh: Array<[string, string, Gender]> = [
    ["24.001", "Aditya Pratama", Gender.LAKI_LAKI],
    ["24.002", "Aisyah Putri", Gender.PEREMPUAN],
    ["24.003", "Bimo Aji", Gender.LAKI_LAKI],
    ["24.004", "Clara Sinaga", Gender.PEREMPUAN],
    ["24.005", "Dimas Rizky", Gender.LAKI_LAKI],
    ["24.006", "Erin Lestari", Gender.PEREMPUAN],
    ["24.007", "Fajar Nugroho", Gender.LAKI_LAKI],
    ["24.008", "Gita Maharani", Gender.PEREMPUAN],
    ["24.009", "Hafidz Ramadhan", Gender.LAKI_LAKI],
    ["24.010", "Intan Permata", Gender.PEREMPUAN],
  ];
  for (const [nis, name, gender] of siswaContoh) {
    await prisma.student.upsert({
      where: { schoolId_nis: { schoolId: school.id, nis } },
      update: {},
      create: { schoolId: school.id, classRoomId: kelas.id, nis, nisn: String(1000000000 + Number(nis.slice(3))), name, gender, birthPlace: "Jakarta", birthDate: new Date(2009, 0, 15), status: StudentStatus.ACTIVE, angkatan: "2024" },
    });
  }

  // 6) Penugasan demo: Budi mengajar Matematika di XI IPA 1
  const mat = await prisma.subject.findUniqueOrThrow({ where: { code: "MAT" } });
  const assignment = await prisma.teachingAssignment.upsert({
    where: { classRoomId_subjectId_academicYearId: { classRoomId: kelas.id, subjectId: mat.id, academicYearId: tahunAjaran.id } },
    update: {},
    create: { schoolId: school.id, teacherId: guru.id, classRoomId: kelas.id, subjectId: mat.id, academicYearId: tahunAjaran.id },
  });

  // 7) Komponen nilai demo (bobot total idealnya 100)
  const komponen: Array<[string, number, number]> = [
    ["Tugas", 20, 1],
    ["Ulangan Harian", 30, 2],
    ["PTS", 20, 3],
    ["PAS", 30, 4],
  ];
  for (const [name, weight, order] of komponen) {
    const existing = await prisma.component.findFirst({ where: { assignmentId: assignment.id, name } });
    if (!existing) await prisma.component.create({ data: { assignmentId: assignment.id, name, weight, order } });
  }

  // 8) Field biodata custom contoh (global)
  const fields: Array<[string, string]> = [["namaAyah", "Nama Ayah"], ["namaIbu", "Nama Ibu"], ["alamat", "Alamat"], ["noHpOrtu", "No. HP Orang Tua"]];
  for (const [key, label] of fields) {
    const exists = await prisma.fieldDefinition.findFirst({ where: { schoolId: null, entity: "STUDENT", key } });
    if (!exists) await prisma.fieldDefinition.create({ data: { schoolId: null, entity: "STUDENT", key, label, type: "TEXT", order: 10 } });
  }

  console.log("✅ Seed selesai.");
  console.log("   ADMIN : admin@sinilai.id / admin123");
  console.log("   GURU  : guru@sinilai.id  / guru123");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
