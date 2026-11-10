import type { Metadata } from "next";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createYearAction, activateYearAction, deleteYearAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SEMESTER_LABEL } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Tahun Ajaran" };

export default async function TahunAjaranPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; sekolah?: string }> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const isAdmin = session.role === "ADMIN";
  const schools = isAdmin ? await prisma.school.findMany({ orderBy: { name: "asc" } }) : [];
  const schoolFilter = isAdmin ? (sp.sekolah ? { schoolId: sp.sekolah } : {}) : { schoolId: session.schoolId ?? "__none__" };
  const years = await prisma.academicYear.findMany({ where: schoolFilter, include: { school: true, _count: { select: { assignments: true } } }, orderBy: [{ year: "desc" }, { semester: "asc" }] });

  return (
    <div>
      <PageHeader title="Tahun Ajaran" subtitle="Tahun ajaran aktif dipakai sebagai default saat membuat penugasan. Satu sekolah hanya boleh punya 1 yang aktif." />
      <Alert searchParams={sp} />
      {isAdmin && (
        <form method="get" className="mb-4 flex items-center gap-2">
          <select name="sekolah" defaultValue={sp.sekolah ?? ""} className="input w-auto"><option value="">Semua sekolah</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn-outline btn-sm">Filter</button>
        </form>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <form action={createYearAction} className="card h-fit p-5">
          <h2 className="mb-3 font-bold text-slate-800">Tambah Tahun Ajaran</h2>
          <input type="hidden" name="redirectTo" value="/tahun-ajaran" />
          <div className="space-y-3">
            {isAdmin && (
              <Field label="Sekolah" required>
                <select name="schoolId" defaultValue={sp.sekolah ?? ""} className="input" required><option value="">Pilih sekolah…</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </Field>
            )}
            <Field label="Tahun Ajaran" required hint="Format: 2026/2027"><input name="year" required className="input" placeholder="2026/2027" pattern="\d{4}/\d{4}" /></Field>
            <Field label="Semester" required><select name="semester" className="input"><option value="GANJIL">Ganjil</option><option value="GENAP">Genap</option></select></Field>
          </div>
          <button type="submit" className="btn-primary mt-4">Tambah</button>
        </form>

        <div className="xl:col-span-2">
          {years.length === 0 ? <EmptyState title="Belum ada tahun ajaran" subtitle="Tambahkan minimal satu, lalu tandai Aktif." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr>{isAdmin && <th>Sekolah</th>}<th>Tahun Ajaran</th><th>Semester</th><th>Penugasan</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      {isAdmin && <td className="max-w-[180px] truncate text-xs">{y.school.name}</td>}
                      <td className="font-semibold">{y.year}</td>
                      <td>{SEMESTER_LABEL[y.semester]}</td>
                      <td>{y._count.assignments}</td>
                      <td>{y.isActive ? <span className="badge-green inline-flex items-center gap-1"><CheckCircle2 size={12} />Aktif</span> : <span className="badge-slate">Nonaktif</span>}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {!y.isActive && <form action={activateYearAction}><input type="hidden" name="id" value={y.id} /><button className="btn-outline btn-sm">Jadikan Aktif</button></form>}
                          <form action={deleteYearAction}><input type="hidden" name="id" value={y.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message="Hapus tahun ajaran ini?">Hapus</ConfirmSubmit></form>
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
