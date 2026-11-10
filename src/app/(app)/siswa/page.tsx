import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { deleteStudentAction } from "@/server/actions";
import { PageHeader, Alert, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { STATUS_LABEL, formatDate } from "@/lib/utils";
import { Plus, Upload, FileSpreadsheet, FileDown, Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Data Siswa" };

export default async function SiswaPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string; kelas?: string; status?: string; sekolah?: string }> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const isAdmin = session.role === "ADMIN";

  const schools = isAdmin ? await prisma.school.findMany({ orderBy: { name: "asc" } }) : [];
  const effectiveSchoolId = isAdmin ? sp.sekolah ?? undefined : session.schoolId ?? "__none__";

  const classes = await prisma.classRoom.findMany({ where: effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}, include: { school: true }, orderBy: [{ name: "asc" }] });

  const where: Record<string, unknown> = {};
  if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
  if (sp.kelas) where.classRoomId = sp.kelas === "-" ? null : sp.kelas;
  if (sp.status) where.status = sp.status;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { nis: { contains: sp.q } }, { nisn: { contains: sp.q } }];

  const students = await prisma.student.findMany({ where, include: { classRoom: true, school: true }, orderBy: [{ classRoom: { name: "asc" } }, { name: "asc" }], take: 500 });

  const exportQuery = new URLSearchParams();
  if (isAdmin && sp.sekolah) exportQuery.set("sekolah", sp.sekolah);
  if (sp.kelas) exportQuery.set("kelas", sp.kelas);
  if (sp.status) exportQuery.set("status", sp.status);
  if (sp.q) exportQuery.set("q", sp.q);
  const exportUrl = `/api/siswa/export?${exportQuery.toString()}`;

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        subtitle={isAdmin ? "Kelola biodata siswa. Guru hanya bisa melihat." : "Daftar siswa di sekolah Anda (hanya lihat)."}
        action={
          <>
            <a href={exportUrl} className="btn-outline btn-sm"><FileDown size={15} /> Export Excel</a>
            {isAdmin && <Link href="/siswa/import" className="btn-outline btn-sm"><Upload size={15} /> Import</Link>}
            {isAdmin && <Link href="/siswa/baru" className="btn-primary btn-sm"><Plus size={15} /> Tambah Siswa</Link>}
          </>
        }
      />
      <Alert searchParams={sp} />

      {/* Filter */}
      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        {isAdmin && (
          <select name="sekolah" defaultValue={sp.sekolah ?? ""} className="input w-auto">
            <option value="">Semua sekolah</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select name="kelas" defaultValue={sp.kelas ?? ""} className="input w-auto">
          <option value="">Semua kelas</option>
          <option value="-">Belum ditempatkan</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{isAdmin && !sp.sekolah ? `${c.name} — ${c.school.name}` : c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="GRADUATED">Lulus</option>
          <option value="MOVED_OUT">Pindah</option>
        </select>
        <input name="q" defaultValue={sp.q} className="input max-w-[220px]" placeholder="Cari nama / NIS / NISN…" />
        <button className="btn-outline btn-sm">Terapkan</button>
        <a href="/siswa" className="btn-ghost btn-sm">Reset</a>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400"><FileSpreadsheet size={13} /> {students.length} siswa{students.length === 500 && " (maks 500, perhalus filter)"}</span>
      </form>

      {students.length === 0 ? (
        <EmptyState title="Tidak ada siswa ditemukan" subtitle="Coba ubah filter, atau tambahkan siswa baru / impor dari Excel." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{isAdmin && <th>Sekolah</th>}<th>NIS</th><th>Nama</th><th>Kelas</th><th>L/P</th><th>Tgl Lahir</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  {isAdmin && <td className="max-w-[170px] truncate text-xs">{s.school.name}</td>}
                  <td className="font-mono text-xs">{s.nis}</td>
                  <td><p className="font-semibold text-slate-800">{s.name}</p>{s.nisn && <p className="text-[10px] text-slate-400">NISN {s.nisn}</p>}</td>
                  <td>{s.classRoom?.name ?? <span className="text-slate-400">—</span>}</td>
                  <td>{s.gender === "LAKI_LAKI" ? "L" : s.gender === "PEREMPUAN" ? "P" : "-"}</td>
                  <td className="whitespace-nowrap text-xs">{formatDate(s.birthDate)}</td>
                  <td>{s.status === "ACTIVE" ? <span className="badge-green">{STATUS_LABEL[s.status]}</span> : <span className="badge-slate">{STATUS_LABEL[s.status]}</span>}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/siswa/${s.id}`} className="btn-ghost btn-sm text-brand-700"><Pencil size={14} /></Link>
                        <form action={deleteStudentAction}><input type="hidden" name="id" value={s.id} /><ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus siswa ${s.name}? Nilai ikut terhapus.`}>Hapus</ConfirmSubmit></form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
