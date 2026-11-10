import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createAssignmentAction, deleteAssignmentAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SEMESTER_LABEL } from "@/lib/utils";
import { Settings2, PenLine } from "lucide-react";

export const metadata: Metadata = { title: "Penugasan Guru" };

export default async function PenugasanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; sekolah?: string }> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const isAdmin = session.role === "ADMIN";
  const schools = isAdmin ? await prisma.school.findMany({ orderBy: { name: "asc" } }) : [];

  const where = isAdmin ? (sp.sekolah ? { schoolId: sp.sekolah } : {}) : { teacherId: session.uid };
  const assignments = await prisma.teachingAssignment.findMany({
    where,
    include: { school: true, teacher: true, classRoom: true, subject: true, academicYear: true, _count: { select: { components: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Data untuk form (admin)
  const formSchoolId = sp.sekolah ?? schools[0]?.id ?? "";
  const [classes, teachers, subjects, years] = isAdmin ? await Promise.all([
    formSchoolId ? prisma.classRoom.findMany({ where: { schoolId: formSchoolId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    formSchoolId ? prisma.user.findMany({ where: { role: "GURU", isActive: true, schoolId: formSchoolId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    formSchoolId ? prisma.academicYear.findMany({ where: { schoolId: formSchoolId }, orderBy: [{ year: "desc" }, { semester: "asc" }] }) : Promise.resolve([]),
  ]) : [[], [], [], []];

  return (
    <div>
      <PageHeader title="Penugasan Guru" subtitle={isAdmin ? "Petakan guru → kelas → mapel → tahun ajaran. Satu kelas+mapel+semester hanya boleh 1 penugasan." : "Daftar penugasan mengajar Anda."} />
      <Alert searchParams={sp} />
      {isAdmin && (
        <form method="get" className="mb-4 flex items-center gap-2">
          <select name="sekolah" defaultValue={sp.sekolah ?? ""} className="input w-auto"><option value="">Semua sekolah</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn-outline btn-sm">Filter</button>
        </form>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {isAdmin && (
          <form action={createAssignmentAction} className="card h-fit p-5">
            <h2 className="mb-3 font-bold text-slate-800">Tambah Penugasan</h2>
            <input type="hidden" name="redirectTo" value={`/penugasan${formSchoolId ? `?sekolah=${formSchoolId}` : ""}`} />
            <div className="space-y-3">
              <Field label="Kelas" required>
                <select name="classRoomId" className="input" required defaultValue=""><option value="">Pilih kelas…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </Field>
              <Field label="Mata Pelajaran" required>
                <select name="subjectId" className="input" required defaultValue=""><option value="">Pilih mapel…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select>
              </Field>
              <Field label="Guru" required>
                <select name="teacherId" className="input" required defaultValue=""><option value="">Pilih guru…</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </Field>
              <Field label="Tahun Ajaran" required hint={years.find((y) => y.isActive) ? "Ada yang aktif — pilih dengan teliti" : "Belum ada yang aktif di sekolah ini"}>
                <select name="academicYearId" className="input" required defaultValue={years.find((y) => y.isActive)?.id ?? ""}>
                  <option value="">Pilih tahun ajaran…</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.year} — {SEMESTER_LABEL[y.semester]}{y.isActive ? " (Aktif)" : ""}</option>)}
                </select>
              </Field>
            </div>
            {classes.length === 0 && <p className="mt-2 text-xs text-amber-700">Tidak ada kelas di sekolah terpilih. Buat kelas dulu di menu Kelas.</p>}
            <button type="submit" className="btn-primary mt-4" disabled={classes.length === 0}>Tambah Penugasan</button>
          </form>
        )}

        <div className={isAdmin ? "xl:col-span-2" : "xl:col-span-3"}>
          {assignments.length === 0 ? <EmptyState title="Belum ada penugasan" subtitle={isAdmin ? "Pilih sekolah lewat filter di atas, lalu buat penugasan." : "Belum ada penugasan. Hubungi admin sekolah Anda."} /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr>{isAdmin && <th>Sekolah</th>}<th>Guru</th><th>Kelas</th><th>Mapel</th><th>TA</th><th>Komponen</th><th>Aksi</th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      {isAdmin && <td className="max-w-[150px] truncate text-xs">{a.school.name}</td>}
                      <td className="max-w-[150px] truncate">{a.teacher.name}</td>
                      <td className="font-semibold">{a.classRoom.name}</td>
                      <td>{a.subject.name}</td>
                      <td className="whitespace-nowrap text-xs">{a.academicYear.year}<br />{SEMESTER_LABEL[a.academicYear.semester]}</td>
                      <td><span className="badge-blue">{a._count.components}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/penugasan/${a.id}`} className="btn-ghost btn-sm text-brand-700" title="Kelola komponen nilai"><Settings2 size={14} /></Link>
                          <Link href={`/penilaian/${a.id}`} className="btn-ghost btn-sm text-emerald-700" title="Input nilai"><PenLine size={14} /></Link>
                          {isAdmin && <form action={deleteAssignmentAction}><input type="hidden" name="id" value={a.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message="Hapus penugasan? Semua komponen & nilai akan ikut terhapus.">Hapus</ConfirmSubmit></form>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
