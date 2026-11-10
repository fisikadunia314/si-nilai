"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, setSessionCookie, clearSessionCookie, type SessionPayload } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { Role, Semester, StudentStatus, Gender, FieldEntity, FieldType } from "@prisma/client";

// ---------- helpers ----------
function back(to: string, params: Record<string, string>): never {
  const q = new URLSearchParams(params).toString();
  redirect(`${to}?${q}`);
}
async function me(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
async function meAdmin(): Promise<SessionPayload> {
  const s = await me();
  if (s.role !== "ADMIN") back("/dashboard", { error: "Akses khusus admin." });
  return s;
}
const f = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fOpt = (fd: FormData, key: string) => { const v = f(fd, key); return v === "" ? null : v; };
const fNum = (fd: FormData, key: string) => { const v = f(fd, key); const n = Number(v.replace(",", ".")); return isNaN(n) ? null : n; };
const fDate = (fd: FormData, key: string) => { const v = f(fd, key); if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

/** Cek akses sekolah: admin bebas, guru hanya sekolahnya. */
function assertSchoolAccess(s: SessionPayload, schoolId: string | null | undefined) {
  if (s.role === "ADMIN") return;
  if (!schoolId || schoolId !== s.schoolId) {
    const err = new Error("FORBIDDEN");
    throw err;
  }
}

// ---------- AUTH ----------
export async function loginAction(fd: FormData) {
  const email = f(fd, "email").toLowerCase();
  const password = f(fd, "password");
  const user = await prisma.user.findUnique({ where: { email }, include: { school: true } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    back("/login", { error: "Email atau password salah, atau akun dinonaktifkan." });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ uid: user.id, name: user.name, email: user.email, role: user.role, schoolId: user.schoolId, schoolName: user.school?.name ?? null });
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(fd: FormData) {
  const s = await me();
  const redirectTo = f(fd, "redirectTo") || "/pengaturan";
  const current = f(fd, "currentPassword");
  const next = f(fd, "newPassword");
  if (next.length < 6) back(redirectTo, { error: "Password baru minimal 6 karakter." });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  if (!(await verifyPassword(current, user.passwordHash))) back(redirectTo, { error: "Password saat ini salah." });
  await prisma.user.update({ where: { id: s.uid }, data: { passwordHash: await hashPassword(next) } });
  back(redirectTo, { ok: "Password berhasil diubah." });
}

// ---------- SEKOLAH (admin) ----------
export async function createSchoolAction(fd: FormData) {
  await meAdmin();
  const name = f(fd, "name"); if (!name) back("/sekolah", { error: "Nama sekolah wajib." });
  const npsn = fOpt(fd, "npsn");
  if (npsn) {
    const dup = await prisma.school.findUnique({ where: { npsn } });
    if (dup) back("/sekolah", { error: `NPSN ${npsn} sudah dipakai sekolah lain.` });
  }
  await prisma.school.create({ data: { name, npsn, jenjang: fOpt(fd, "jenjang"), address: fOpt(fd, "address"), city: fOpt(fd, "city"), passingGrade: fNum(fd, "passingGrade") ?? 75 } });
  back("/sekolah", { ok: "Sekolah ditambahkan." });
}

export async function updateSchoolAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  const name = f(fd, "name"); if (!name) back("/sekolah", { error: "Nama sekolah wajib." });
  const npsn = fOpt(fd, "npsn");
  if (npsn) { const dup = await prisma.school.findFirst({ where: { npsn, NOT: { id } } }); if (dup) back("/sekolah", { error: `NPSN ${npsn} sudah dipakai.` }); }
  await prisma.school.update({ where: { id }, data: { name, npsn, jenjang: fOpt(fd, "jenjang"), address: fOpt(fd, "address"), city: fOpt(fd, "city"), passingGrade: fNum(fd, "passingGrade") ?? 75 } });
  back("/sekolah", { ok: "Sekolah diperbarui." });
}

export async function deleteSchoolAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  const count = await prisma.student.count({ where: { schoolId: id } });
  if (count > 0) back("/sekolah", { error: `Tidak bisa hapus: sekolah masih punya ${count} siswa.` });
  await prisma.school.delete({ where: { id } });
  back("/sekolah", { ok: "Sekolah dihapus." });
}

// ---------- USER (admin) ----------
const userSchema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.nativeEnum(Role) });

export async function createUserAction(fd: FormData) {
  await meAdmin();
  const redirectTo = f(fd, "redirectTo") || "/users";
  const parsed = userSchema.safeParse({ name: f(fd, "name"), email: f(fd, "email").toLowerCase(), role: f(fd, "role") });
  if (!parsed.success) back(redirectTo, { error: "Data tidak valid. Periksa nama/email/role." });
  const password = f(fd, "password");
  if (password.length < 6) back(redirectTo, { error: "Password minimal 6 karakter." });
  const role = parsed.data.role;
  const schoolId = role === "ADMIN" ? null : fOpt(fd, "schoolId");
  if (role === "GURU" && !schoolId) back(redirectTo, { error: "Guru wajib ditugaskan ke sebuah sekolah." });
  const dup = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (dup) back(redirectTo, { error: "Email sudah dipakai." });
  await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, role, schoolId, passwordHash: await hashPassword(password) } });
  back(redirectTo, { ok: "Pengguna ditambahkan." });
}

export async function updateUserAction(fd: FormData) {
  const admin = await meAdmin();
  const redirectTo = f(fd, "redirectTo") || "/users";
  const id = f(fd, "id");
  const parsed = userSchema.safeParse({ name: f(fd, "name"), email: f(fd, "email").toLowerCase(), role: f(fd, "role") });
  if (!parsed.success) back(redirectTo, { error: "Data tidak valid." });
  const role = parsed.data.role;
  const schoolId = role === "ADMIN" ? null : fOpt(fd, "schoolId");
  if (role === "GURU" && !schoolId) back(redirectTo, { error: "Guru wajib ditugaskan ke sebuah sekolah." });
  const dup = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id } } });
  if (dup) back(redirectTo, { error: "Email sudah dipakai akun lain." });
  const data: Record<string, unknown> = { name: parsed.data.name, email: parsed.data.email, role, schoolId, isActive: fd.get("isActive") === "on" };
  const password = f(fd, "password");
  if (password) { if (password.length < 6) back(redirectTo, { error: "Password minimal 6 karakter." }); data.passwordHash = await hashPassword(password); }
  if (id === admin.uid && data.isActive === false) back(redirectTo, { error: "Tidak bisa menonaktifkan akun sendiri." });
  await prisma.user.update({ where: { id }, data });
  back(redirectTo, { ok: "Pengguna diperbarui." });
}

export async function deleteUserAction(fd: FormData) {
  const admin = await meAdmin();
  const id = f(fd, "id");
  if (id === admin.uid) back("/users", { error: "Tidak bisa menghapus akun sendiri." });
  await prisma.user.delete({ where: { id } });
  back("/users", { ok: "Pengguna dihapus." });
}

// ---------- KELAS (admin/guru untuk sekolahnya) ----------
export async function createClassAction(fd: FormData) {
  const s = await me();
  const redirectTo = f(fd, "redirectTo") || "/kelas";
  const schoolId = s.role === "ADMIN" ? fOpt(fd, "schoolId") : s.schoolId!;
  if (!schoolId) back(redirectTo, { error: "Pilih sekolah." });
  const name = f(fd, "name"); if (!name) back(redirectTo, { error: "Nama kelas wajib." });
  const dup = await prisma.classRoom.findFirst({ where: { schoolId, name } });
  if (dup) back(redirectTo, { error: `Kelas ${name} sudah ada di sekolah ini.` });
  await prisma.classRoom.create({ data: { schoolId, name, gradeLevel: fOpt(fd, "gradeLevel") } });
  back(redirectTo, { ok: "Kelas ditambahkan." });
}

export async function updateClassAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const cls = await prisma.classRoom.findUnique({ where: { id } });
  if (!cls) back("/kelas", { error: "Kelas tidak ditemukan." });
  try { assertSchoolAccess(s, cls.schoolId); } catch { back("/kelas", { error: "Bukan kelas sekolah Anda." }); }
  const name = f(fd, "name"); if (!name) back("/kelas", { error: "Nama kelas wajib." });
  const dup = await prisma.classRoom.findFirst({ where: { schoolId: cls.schoolId, name, NOT: { id } } });
  if (dup) back("/kelas", { error: `Kelas ${name} sudah ada.` });
  await prisma.classRoom.update({ where: { id }, data: { name, gradeLevel: fOpt(fd, "gradeLevel") } });
  back("/kelas", { ok: "Kelas diperbarui." });
}

export async function deleteClassAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const cls = await prisma.classRoom.findUnique({ where: { id }, include: { _count: { select: { students: true } } } });
  if (!cls) back("/kelas", { error: "Kelas tidak ditemukan." });
  try { assertSchoolAccess(s, cls.schoolId); } catch { back("/kelas", { error: "Bukan kelas sekolah Anda." }); }
  if (cls._count.students > 0) back("/kelas", { error: `Tidak bisa hapus: masih ada ${cls._count.students} siswa di kelas ini.` });
  await prisma.classRoom.delete({ where: { id } });
  back("/kelas", { ok: "Kelas dihapus." });
}

// ---------- TAHUN AJARAN ----------
export async function createYearAction(fd: FormData) {
  const s = await me();
  const redirectTo = f(fd, "redirectTo") || "/tahun-ajaran";
  const schoolId = s.role === "ADMIN" ? fOpt(fd, "schoolId") : s.schoolId!;
  if (!schoolId) back(redirectTo, { error: "Pilih sekolah." });
  const year = f(fd, "year");
  if (!/^\d{4}\/\d{4}$/.test(year)) back(redirectTo, { error: "Format tahun ajaran: 2026/2027" });
  const semester = f(fd, "semester") as Semester;
  if (!["GANJIL", "GENAP"].includes(semester)) back(redirectTo, { error: "Semester tidak valid." });
  const dup = await prisma.academicYear.findUnique({ where: { schoolId_year_semester: { schoolId, year, semester } } });
  if (dup) back(redirectTo, { error: "Tahun ajaran + semester itu sudah ada." });
  await prisma.academicYear.create({ data: { schoolId, year, semester } });
  back(redirectTo, { ok: "Tahun ajaran ditambahkan." });
}

export async function activateYearAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const yr = await prisma.academicYear.findUnique({ where: { id } });
  if (!yr) back("/tahun-ajaran", { error: "Tidak ditemukan." });
  try { assertSchoolAccess(s, yr.schoolId); } catch { back("/tahun-ajaran", { error: "Bukan sekolah Anda." }); }
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { schoolId: yr.schoolId }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
  ]);
  back("/tahun-ajaran", { ok: "Tahun ajaran aktif diperbarui." });
}

export async function deleteYearAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const yr = await prisma.academicYear.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!yr) back("/tahun-ajaran", { error: "Tidak ditemukan." });
  try { assertSchoolAccess(s, yr.schoolId); } catch { back("/tahun-ajaran", { error: "Bukan sekolah Anda." }); }
  if (yr._count.assignments > 0) back("/tahun-ajaran", { error: "Tidak bisa hapus: masih dipakai penugasan." });
  await prisma.academicYear.delete({ where: { id } });
  back("/tahun-ajaran", { ok: "Tahun ajaran dihapus." });
}

// ---------- MAPEL (admin) ----------
export async function createSubjectAction(fd: FormData) {
  await meAdmin();
  const code = f(fd, "code").toUpperCase(); const name = f(fd, "name");
  if (!code || !name) back("/mapel", { error: "Kode dan nama mapel wajib." });
  const dup = await prisma.subject.findUnique({ where: { code } });
  if (dup) back("/mapel", { error: `Kode ${code} sudah dipakai.` });
  await prisma.subject.create({ data: { code, name, isCustom: true } });
  back("/mapel", { ok: "Mata pelajaran ditambahkan." });
}

export async function updateSubjectAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id"); const name = f(fd, "name");
  if (!name) back("/mapel", { error: "Nama mapel wajib." });
  await prisma.subject.update({ where: { id }, data: { name } });
  back("/mapel", { ok: "Mata pelajaran diperbarui." });
}

export async function deleteSubjectAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  const used = await prisma.teachingAssignment.count({ where: { subjectId: id } });
  if (used > 0) back("/mapel", { error: `Tidak bisa hapus: mapel dipakai di ${used} penugasan.` });
  await prisma.subject.delete({ where: { id } });
  back("/mapel", { ok: "Mata pelajaran dihapus." });
}

// ---------- SISWA CRUD (admin; guru read-only) ----------
async function validatedStudentExtra(fd: FormData, schoolId: string): Promise<Record<string, unknown> | string> {
  const defs = await prisma.fieldDefinition.findMany({ where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, { schoolId }] } });
  const extra: Record<string, unknown> = {};
  for (const d of defs) {
    const raw = f(fd, `extra:${d.key}`);
    if (d.type === "BOOLEAN") { extra[d.key] = fd.get(`extra:${d.key}`) === "on"; continue; }
    if (!raw) { if (d.required) return `Field "${d.label}" wajib diisi.`; continue; }
    if (d.type === "NUMBER") { const n = Number(raw.replace(",", ".")); if (isNaN(n)) return `"${d.label}" harus angka.`; extra[d.key] = n; }
    else extra[d.key] = raw;
  }
  return extra;
}

export async function createStudentAction(fd: FormData) {
  const s = await meAdmin();
  const redirectTo = f(fd, "redirectTo") || "/siswa/baru";
  const schoolId = fOpt(fd, "schoolId") ?? s.schoolId;
  if (!schoolId) back(redirectTo, { error: "Pilih sekolah." });
  const nis = f(fd, "nis"); const name = f(fd, "name");
  if (!nis || !name) back(redirectTo, { error: "NIS dan nama wajib diisi." });
  const dup = await prisma.student.findUnique({ where: { schoolId_nis: { schoolId, nis } } });
  if (dup) back(redirectTo, { error: `NIS ${nis} sudah terdaftar di sekolah ini.` });
  const extra = await validatedStudentExtra(fd, schoolId);
  if (typeof extra === "string") back(redirectTo, { error: extra });
  await prisma.student.create({
    data: {
      schoolId, classRoomId: fOpt(fd, "classRoomId"), nis, nisn: fOpt(fd, "nisn"), name,
      gender: (fOpt(fd, "gender") as Gender | null) ?? null, birthPlace: fOpt(fd, "birthPlace"),
      birthDate: fDate(fd, "birthDate"), status: (fOpt(fd, "status") as StudentStatus) ?? "ACTIVE",
      angkatan: fOpt(fd, "angkatan"), extra: extra as object,
    },
  });
  back("/siswa", { ok: "Siswa ditambahkan." });
}

export async function updateStudentAction(fd: FormData) {
  const s = await meAdmin();
  const id = f(fd, "id");
  const st = await prisma.student.findUnique({ where: { id } });
  if (!st) back("/siswa", { error: "Siswa tidak ditemukan." });
  try { assertSchoolAccess(s, st.schoolId); } catch { back("/siswa", { error: "Bukan siswa sekolah Anda." }); }
  const redirectTo = f(fd, "redirectTo") || `/siswa/${id}`;
  const nis = f(fd, "nis"); const name = f(fd, "name");
  if (!nis || !name) back(redirectTo, { error: "NIS dan nama wajib diisi." });
  const dup = await prisma.student.findFirst({ where: { schoolId: st.schoolId, nis, NOT: { id } } });
  if (dup) back(redirectTo, { error: `NIS ${nis} sudah dipakai siswa lain.` });
  const extra = await validatedStudentExtra(fd, st.schoolId);
  if (typeof extra === "string") back(redirectTo, { error: extra });
  await prisma.student.update({
    where: { id },
    data: {
      classRoomId: fOpt(fd, "classRoomId"), nis, nisn: fOpt(fd, "nisn"), name,
      gender: (fOpt(fd, "gender") as Gender | null) ?? null, birthPlace: fOpt(fd, "birthPlace"),
      birthDate: fDate(fd, "birthDate"), status: (fOpt(fd, "status") as StudentStatus) ?? "ACTIVE",
      angkatan: fOpt(fd, "angkatan"), extra: extra as object,
    },
  });
  back("/siswa", { ok: "Data siswa diperbarui." });
}

export async function deleteStudentAction(fd: FormData) {
  const s = await meAdmin();
  const id = f(fd, "id");
  const st = await prisma.student.findUnique({ where: { id } });
  if (!st) back("/siswa", { error: "Tidak ditemukan." });
  try { assertSchoolAccess(s, st.schoolId); } catch { back("/siswa", { error: "Bukan siswa sekolah Anda." }); }
  await prisma.student.delete({ where: { id } });
  back("/siswa", { ok: "Siswa dihapus." });
}

// ---------- PENUGASAN (admin) ----------
export async function createAssignmentAction(fd: FormData) {
  await meAdmin();
  const redirectTo = f(fd, "redirectTo") || "/penugasan";
  const classRoomId = f(fd, "classRoomId"); const subjectId = f(fd, "subjectId");
  const teacherId = f(fd, "teacherId"); const academicYearId = f(fd, "academicYearId");
  if (!classRoomId || !subjectId || !teacherId || !academicYearId) back(redirectTo, { error: "Semua field wajib diisi." });
  const [cls, year] = await Promise.all([prisma.classRoom.findUnique({ where: { id: classRoomId } }), prisma.academicYear.findUnique({ where: { id: academicYearId } })]);
  if (!cls || !year) back(redirectTo, { error: "Kelas atau tahun ajaran tidak ditemukan." });
  if (cls.schoolId !== year.schoolId) back(redirectTo, { error: "Kelas dan tahun ajaran beda sekolah." });
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== "GURU") back(redirectTo, { error: "Pilih guru yang valid." });
  if (teacher.schoolId !== cls.schoolId) back(redirectTo, { error: "Guru itu bukan dari sekolah yang sama dengan kelas." });
  const dup = await prisma.teachingAssignment.findUnique({ where: { classRoomId_subjectId_academicYearId: { classRoomId, subjectId, academicYearId } } });
  if (dup) back(redirectTo, { error: "Penugasan untuk kelas+mapel+tahun ajaran itu sudah ada." });
  await prisma.teachingAssignment.create({ data: { schoolId: cls.schoolId, teacherId, classRoomId, subjectId, academicYearId } });
  back(redirectTo, { ok: "Penugasan ditambahkan." });
}

export async function deleteAssignmentAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  await prisma.teachingAssignment.delete({ where: { id } });
  back("/penugasan", { ok: "Penugasan dihapus (beserta komponen & nilainya)." });
}

// ---------- KOMPONEN NILAI (pemilik penugasan atau admin) ----------
async function assertAssignmentOwner(s: SessionPayload, assignmentId: string) {
  const a = await prisma.teachingAssignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("NOT_FOUND");
  if (s.role !== "ADMIN" && a.teacherId !== s.uid) throw new Error("FORBIDDEN");
  return a;
}

export async function createComponentAction(fd: FormData) {
  const s = await me();
  const redirectTo = f(fd, "redirectTo") || "/penugasan";
  const assignmentId = f(fd, "assignmentId");
  try { await assertAssignmentOwner(s, assignmentId); } catch { back(redirectTo, { error: "Bukan penugasan Anda." }); }
  const name = f(fd, "name");
  const weight = fNum(fd, "weight");
  if (!name || weight === null || weight <= 0) back(redirectTo, { error: "Nama wajib dan bobot harus > 0." });
  const order = fNum(fd, "order") ?? 0;
  await prisma.component.create({ data: { assignmentId, name, weight, order } });
  revalidatePath(redirectTo);
  back(redirectTo, { ok: "Komponen ditambahkan." });
}

export async function updateComponentAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const comp = await prisma.component.findUnique({ where: { id } });
  if (!comp) back("/penugasan", { error: "Komponen tidak ditemukan." });
  try { await assertAssignmentOwner(s, comp.assignmentId); } catch { back("/penugasan", { error: "Bukan komponen Anda." }); }
  const redirectTo = f(fd, "redirectTo") || "/penugasan";
  const name = f(fd, "name");
  const weight = fNum(fd, "weight");
  if (!name || weight === null || weight <= 0) back(redirectTo, { error: "Nama wajib dan bobot harus > 0." });
  await prisma.component.update({ where: { id }, data: { name, weight, order: fNum(fd, "order") ?? comp.order } });
  revalidatePath(redirectTo);
  back(redirectTo, { ok: "Komponen diperbarui." });
}

export async function deleteComponentAction(fd: FormData) {
  const s = await me();
  const id = f(fd, "id");
  const comp = await prisma.component.findUnique({ where: { id } });
  if (!comp) back("/penugasan", { error: "Tidak ditemukan." });
  try { await assertAssignmentOwner(s, comp.assignmentId); } catch { back("/penugasan", { error: "Bukan komponen Anda." }); }
  const redirectTo = f(fd, "redirectTo") || "/penugasan";
  await prisma.component.delete({ where: { id } });
  revalidatePath(redirectTo);
  back(redirectTo, { ok: "Komponen dihapus." });
}

// ---------- FIELD DEFINITIONS (admin) ----------
export async function createFieldDefAction(fd: FormData) {
  await meAdmin();
  const redirectTo = f(fd, "redirectTo") || "/field-biodata";
  const key = f(fd, "key").replace(/[^a-zA-Z0-9_]/g, ""); const label = f(fd, "label");
  if (!key || !label) back(redirectTo, { error: "Key dan label wajib." });
  const type = f(fd, "type") as FieldType;
  if (!Object.values(FieldType).includes(type)) back(redirectTo, { error: "Tipe tidak valid." });
  const scope = f(fd, "scope");
  const schoolId = scope === "global" ? null : fOpt(fd, "schoolId");
  if (scope === "school" && !schoolId) back(redirectTo, { error: "Pilih sekolah." });
  const dup = await prisma.fieldDefinition.findFirst({ where: { schoolId, entity: FieldEntity.STUDENT, key } });
  if (dup) back(redirectTo, { error: `Key "${key}" sudah ada pada scope itu.` });
  const optionsRaw = f(fd, "options");
  const options = optionsRaw ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean) : null;
  await prisma.fieldDefinition.create({ data: { schoolId, entity: FieldEntity.STUDENT, key, label, type, options: options ?? undefined, required: fd.get("required") === "on", order: fNum(fd, "order") ?? 0 } });
  back(redirectTo, { ok: "Field ditambahkan." });
}

export async function deleteFieldDefAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  await prisma.fieldDefinition.delete({ where: { id } });
  back("/field-biodata", { ok: "Field dihapus. (Data lama di JSON extra tidak hilang.)" });
}

export async function toggleFieldDefAction(fd: FormData) {
  await meAdmin();
  const id = f(fd, "id");
  const d = await prisma.fieldDefinition.findUnique({ where: { id } });
  if (!d) back("/field-biodata", { error: "Tidak ditemukan." });
  await prisma.fieldDefinition.update({ where: { id }, data: { isActive: !d.isActive } });
  back("/field-biodata", { ok: "Status field diperbarui." });
}
