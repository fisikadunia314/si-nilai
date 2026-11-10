import type { Metadata } from "next";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createSubjectAction, updateSubjectAction, deleteSubjectAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Pencil, BookMarked } from "lucide-react";

export const metadata: Metadata = { title: "Mata Pelajaran" };

export default async function MapelPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string; q?: string }> }) {
  const session = await requireUser();
  const isAdmin = session.role === "ADMIN";
  const sp = await searchParams;
  const where = sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" as const } }, { code: { contains: sp.q, mode: "insensitive" as const } }] } : {};
  const subjects = await prisma.subject.findMany({ where, include: { _count: { select: { assignments: true } } }, orderBy: { name: "asc" } });
  const editing = sp.edit ? subjects.find((s) => s.id === sp.edit) : null;

  return (
    <div>
      <PageHeader title="Mata Pelajaran" subtitle="Master mapel nasional sudah tersedia. Admin bisa menambah mapel khusus sekolah (kejuruan, muatan lokal, dll)." />
      <Alert searchParams={sp} />
      <div className="grid gap-5 xl:grid-cols-3">
        {isAdmin ? (
          <form action={editing ? updateSubjectAction : createSubjectAction} className="card h-fit p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><BookMarked size={17} className="text-brand-600" />{editing ? `Edit ${editing.code}` : "Tambah Mapel"}</h2>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="space-y-3">
              <Field label="Kode" required hint="Singkatan unik, mis. TKJ"><input name="code" required disabled={!!editing} defaultValue={editing?.code} className="input uppercase" placeholder="TKJ" /></Field>
              <Field label="Nama Mata Pelajaran" required><input name="name" required defaultValue={editing?.name} className="input" placeholder="Teknik Komputer dan Jaringan" /></Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" className="btn-primary">{editing ? "Simpan" : "Tambah"}</button>
              {editing && <a href="/mapel" className="btn-outline">Batal</a>}
            </div>
          </form>
        ) : (
          <div className="card h-fit p-5 text-sm text-slate-500">Hanya admin yang bisa mengubah master mapel. Guru dapat melihat daftar untuk keperluan penugasan.</div>
        )}

        <div className="xl:col-span-2">
          <form method="get" className="mb-3 flex items-center gap-2">
            <input name="q" defaultValue={sp.q} className="input max-w-[240px]" placeholder="Cari mapel…" />
            <button className="btn-outline btn-sm">Cari</button>
            {sp.q && <a href="/mapel" className="btn-ghost btn-sm">Reset</a>}
          </form>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th><th>Dipakai</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {subjects.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada mapel cocok.</td></tr>}
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs font-bold">{s.code}</td>
                    <td className="font-medium">{s.name}</td>
                    <td>{s.isCustom ? <span className="badge-blue">Kustom</span> : <span className="badge-slate">Nasional</span>}</td>
                    <td>{s._count.assignments}×</td>
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          <a href={`/mapel?edit=${s.id}`} className="btn-ghost btn-sm text-brand-700"><Pencil size={14} /></a>
                          <form action={deleteSubjectAction}><input type="hidden" name="id" value={s.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus mapel ${s.name}?`}>Hapus</ConfirmSubmit></form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
