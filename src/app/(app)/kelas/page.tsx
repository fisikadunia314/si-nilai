import type { Metadata } from "next";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createClassAction, updateClassAction, deleteClassAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Kelas" };

export default async function KelasPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string; sekolah?: string }> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const isAdmin = session.role === "ADMIN";
  const schools = isAdmin ? await prisma.school.findMany({ orderBy: { name: "asc" } }) : [];
  const schoolFilter = isAdmin ? (sp.sekolah ? { schoolId: sp.sekolah } : {}) : { schoolId: session.schoolId ?? "__none__" };
  const classes = await prisma.classRoom.findMany({ where: schoolFilter, include: { school: true, _count: { select: { students: true, assignments: true } } }, orderBy: [{ name: "asc" }] });
  const editing = sp.edit ? classes.find((c) => c.id === sp.edit) : null;
  const defaultSchool = isAdmin ? sp.sekolah ?? "" : session.schoolId ?? "";

  return (
    <div>
      <PageHeader title="Kelas / Rombel" subtitle={isAdmin ? "Kelola kelas. Gunakan filter untuk melihat per sekolah." : "Daftar kelas di sekolah Anda."} />
      <Alert searchParams={sp} />
      {isAdmin && (
        <form method="get" className="mb-4 flex items-center gap-2">
          <select name="sekolah" defaultValue={sp.sekolah ?? ""} className="input w-auto"><option value="">Semua sekolah</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn-outline btn-sm">Filter</button>
        </form>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <form action={editing ? updateClassAction : createClassAction} className="card h-fit p-5">
          <h2 className="mb-3 font-bold text-slate-800">{editing ? `Edit Kelas ${editing.name}` : "Tambah Kelas"}</h2>
          <input type="hidden" name="redirectTo" value="/kelas" />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="space-y-3">
            {isAdmin && !editing && (
              <Field label="Sekolah" required>
                <select name="schoolId" defaultValue={defaultSchool} className="input" required>
                  <option value="">Pilih sekolah…</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Field label="Nama Kelas" required><input name="name" required defaultValue={editing?.name} className="input" placeholder="XI IPA 1" /></Field></div>
              <Field label="Tingkat"><input name="gradeLevel" defaultValue={editing?.gradeLevel ?? ""} className="input" placeholder="XI" /></Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary">{editing ? "Simpan" : "Tambah Kelas"}</button>
            {editing && <a href="/kelas" className="btn-outline">Batal</a>}
          </div>
        </form>

        <div className="xl:col-span-2">
          {classes.length === 0 ? <EmptyState title="Belum ada kelas" subtitle="Tambahkan kelas pertama lewat form." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr>{isAdmin && <th>Sekolah</th>}<th>Kelas</th><th>Tingkat</th><th>Siswa</th><th>Penugasan</th><th></th></tr></thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      {isAdmin && <td className="max-w-[180px] truncate text-xs">{c.school.name}</td>}
                      <td className="font-semibold">{c.name}</td>
                      <td>{c.gradeLevel ?? "-"}</td>
                      <td>{c._count.students}</td>
                      <td>{c._count.assignments}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <a href={`/kelas?edit=${c.id}${sp.sekolah ? `&sekolah=${sp.sekolah}` : ""}`} className="btn-ghost btn-sm text-brand-700"><Pencil size={14} /></a>
                          <form action={deleteClassAction}><input type="hidden" name="id" value={c.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus kelas ${c.name}?`}>Hapus</ConfirmSubmit></form>
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
