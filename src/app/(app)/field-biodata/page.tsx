import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createFieldDefAction, deleteFieldDefAction, toggleFieldDefAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ListChecks, Power } from "lucide-react";

export const metadata: Metadata = { title: "Field Biodata Custom" };

export default async function FieldBiodataPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [defs, schools] = await Promise.all([
    prisma.fieldDefinition.findMany({ where: { entity: "STUDENT" }, include: { school: true }, orderBy: [{ order: "asc" }, { label: "asc" }] }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Field Biodata Custom" subtitle="Tambahkan kolom biodata siswa tanpa mengubah kode. Field aktif langsung muncul di form siswa, template import, dan export." />
      <Alert searchParams={sp} />

      <div className="grid gap-5 xl:grid-cols-3">
        <form action={createFieldDefAction} className="card h-fit p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><ListChecks size={17} className="text-brand-600" /> Tambah Field</h2>
          <input type="hidden" name="redirectTo" value="/field-biodata" />
          <div className="space-y-3">
            <Field label="Label Tampilan" required hint="Yang dilihat user, mis. “Nama Ayah”"><input name="label" required className="input" placeholder="Nama Ayah" /></Field>
            <Field label="Key (teknis)" required hint="Unik, huruf/angka, mis. namaAyah"><input name="key" required className="input font-mono" placeholder="namaAyah" pattern="[A-Za-z0-9_]+" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipe" required>
                <select name="type" className="input" defaultValue="TEXT">
                  <option value="TEXT">Teks</option>
                  <option value="NUMBER">Angka</option>
                  <option value="DATE">Tanggal</option>
                  <option value="SELECT">Pilihan</option>
                  <option value="BOOLEAN">Ya/Tidak</option>
                </select>
              </Field>
              <Field label="Urutan"><input name="order" type="number" defaultValue={10} className="input" /></Field>
            </div>
            <Field label="Opsi (khusus tipe Pilihan)" hint="Pisahkan dengan koma: Ya, Tidak"><input name="options" className="input" placeholder="Islam, Kristen, Katholik, Hindu, Buddha, Konghucu" /></Field>
            <Field label="Cakupan">
              <select name="scope" className="input" defaultValue="global">
                <option value="global">Global — semua sekolah</option>
                <option value="school">Khusus satu sekolah</option>
              </select>
            </Field>
            <Field label="Sekolah (jika khusus)"><select name="schoolId" className="input" defaultValue=""><option value="">— Pilih —</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="required" className="h-4 w-4 accent-blue-600" /> Wajib diisi</label>
          </div>
          <button type="submit" className="btn-primary mt-4">Tambah Field</button>
        </form>

        <div className="xl:col-span-2">
          {defs.length === 0 ? <EmptyState title="Belum ada field custom" subtitle="Field inti (NIS, NISN, nama, dst.) sudah bawaan. Tambahkan field custom di kiri." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Label</th><th>Key</th><th>Tipe</th><th>Cakupan</th><th>Wajib</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {defs.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.label}</td>
                      <td className="font-mono text-xs">{d.key}</td>
                      <td><span className="badge-slate">{d.type}</span></td>
                      <td className="max-w-[140px] truncate text-xs">{d.school?.name ?? "Global"}</td>
                      <td>{d.required ? "Ya" : "-"}</td>
                      <td>{d.isActive ? <span className="badge-green">Aktif</span> : <span className="badge-slate">Nonaktif</span>}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <form action={toggleFieldDefAction}><input type="hidden" name="id" value={d.id} /><button className="btn-ghost btn-sm" title={d.isActive ? "Nonaktifkan" : "Aktifkan"}><Power size={14} /></button></form>
                          <form action={deleteFieldDefAction}><input type="hidden" name="id" value={d.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus field "${d.label}"? Data tersimpan di JSON tidak ikut terhapus.`}>Hapus</ConfirmSubmit></form>
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
