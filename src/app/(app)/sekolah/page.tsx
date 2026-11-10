import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createSchoolAction, updateSchoolAction, deleteSchoolAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Sekolah" };

export default async function SekolahPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const schools = await prisma.school.findMany({ include: { _count: { select: { students: true, users: true, classes: true } } }, orderBy: { name: "asc" } });
  const editing = sp.edit ? schools.find((s) => s.id === sp.edit) : null;

  return (
    <div>
      <PageHeader title="Sekolah" subtitle="Kelola sekolah yang terdaftar. Setiap sekolah punya data siswa, kelas, dan penilaian yang terpisah." />
      <Alert searchParams={sp} />

      <div className="grid gap-5 xl:grid-cols-3">
        <form action={editing ? updateSchoolAction : createSchoolAction} className="card h-fit p-5">
          <h2 className="mb-3 font-bold text-slate-800">{editing ? "Edit Sekolah" : "Tambah Sekolah"}</h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="space-y-3">
            <Field label="Nama Sekolah" required><input name="name" required defaultValue={editing?.name} className="input" placeholder="SMA Negeri 1 Kota" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NPSN"><input name="npsn" defaultValue={editing?.npsn ?? ""} className="input" placeholder="12345678" inputMode="numeric" /></Field>
              <Field label="Jenjang"><input name="jenjang" defaultValue={editing?.jenjang ?? ""} className="input" placeholder="SMA / SMK / SMP" /></Field>
            </div>
            <Field label="Alamat"><input name="address" defaultValue={editing?.address ?? ""} className="input" placeholder="Jl. Pendidikan No. 1" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kota"><input name="city" defaultValue={editing?.city ?? ""} className="input" placeholder="Jakarta" /></Field>
              <Field label="KKM" hint="Ketuntasan default"><input name="passingGrade" type="number" min={0} max={100} step="0.5" defaultValue={editing?.passingGrade ?? 75} className="input" /></Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary">{editing ? "Simpan Perubahan" : "Tambah Sekolah"}</button>
            {editing && <a href="/sekolah" className="btn-outline">Batal</a>}
          </div>
        </form>

        <div className="xl:col-span-2">
          {schools.length === 0 ? <EmptyState title="Belum ada sekolah" subtitle="Tambahkan sekolah pertama di form sebelah kiri." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Sekolah</th><th>Jenjang</th><th>Siswa</th><th>Kelas</th><th>Akun</th><th></th></tr></thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id}>
                      <td><p className="font-semibold text-slate-800">{s.name}</p><p className="text-[11px] text-slate-400">NPSN {s.npsn ?? "-"}{s.city ? ` • ${s.city}` : ""}</p></td>
                      <td>{s.jenjang ?? "-"}</td>
                      <td>{s._count.students}</td>
                      <td>{s._count.classes}</td>
                      <td>{s._count.users}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <a href={`/sekolah?edit=${s.id}`} className="btn-ghost btn-sm text-brand-700"><Pencil size={14} /> Edit</a>
                          <form action={deleteSchoolAction}><input type="hidden" name="id" value={s.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus sekolah "${s.name}"? Tidak bisa jika masih ada siswanya.`}>Hapus</ConfirmSubmit></form>
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
