import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { buildLegerData, canAccessAssignment } from "@/lib/leger";
import { formatScore } from "@/lib/grade";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileDown, FileText, PenLine } from "lucide-react";

export const metadata: Metadata = { title: "Detail Rekap" };

export default async function RekapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const data = await buildLegerData(id);
  if (!data) notFound();
  if (!canAccessAssignment(session, data.assignment)) notFound();
  const { info, componentNames, rows, assignment } = data;

  const avgOf = (vals: Array<number | null>) => {
    const xs = vals.filter((v): v is number => v != null);
    return xs.length ? Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 100) / 100 : null;
  };
  const colAvgs = componentNames.map((_, i) => avgOf(rows.map((r) => r.values[i])));
  const finalAvg = avgOf(rows.map((r) => r.final));
  const jumlahTuntas = rows.filter((r) => r.passed === true).length;
  const nilaiTerisi = rows.filter((r) => r.final != null).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/rekap" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"><ArrowLeft size={12} /> Rekap & Leger</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Leger — {info.subjectName} <span className="text-slate-400">•</span> {info.className}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{info.teacherName} • TA {info.year} {info.semester} • KKM {info.passingGrade} • {rows.length} siswa aktif</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/penilaian/${assignment.id}`} className="btn-outline btn-sm"><PenLine size={15} /> Edit Nilai</Link>
          <a href={`/api/leger/export?assignmentId=${assignment.id}`} className="btn-outline btn-sm"><FileDown size={15} /> Excel</a>
          <a href={`/api/leger/pdf?assignmentId=${assignment.id}`} className="btn-primary btn-sm"><FileText size={15} /> Cetak PDF</a>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">Siswa ada nilai: <b>{nilaiTerisi}/{rows.length}</b></div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">Tuntas: <b>{jumlahTuntas}</b></div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">Remedial: <b>{rows.filter((r) => r.passed === false).length}</b></div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-brand-800">Rata-rata akhir: <b>{formatScore(finalAvg)}</b></div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>No</th><th>NIS</th><th>Nama Siswa</th>{componentNames.map((n, i) => <th key={i} className="text-center">{n}</th>)}<th className="text-center bg-brand-50">Nilai Akhir</th><th className="text-center">Keterangan</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.nis}>
                <td className="text-slate-400">{i + 1}</td>
                <td className="font-mono text-xs">{r.nis}</td>
                <td className="font-medium">{r.name}</td>
                {r.values.map((v, j) => <td key={j} className="text-center">{formatScore(v)}</td>)}
                <td className={cn("bg-brand-50/60 text-center font-extrabold", r.passed === false && "text-red-600")}>{formatScore(r.final)}</td>
                <td className="text-center">{r.passed == null ? <span className="text-slate-300">—</span> : r.passed ? <span className="badge-green">Tuntas</span> : <span className="badge-red">Remedial</span>}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={3} className="text-right text-xs uppercase tracking-wide text-slate-500">Rata-rata Kelas</td>
              {colAvgs.map((v, i) => <td key={i} className="text-center">{formatScore(v)}</td>)}
              <td className="bg-brand-100/60 text-center">{formatScore(finalAvg)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
