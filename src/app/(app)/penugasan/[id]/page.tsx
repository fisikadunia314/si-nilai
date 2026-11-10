import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createComponentAction, updateComponentAction, deleteComponentAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { canAccessAssignment } from "@/lib/leger";
import { SEMESTER_LABEL, cn } from "@/lib/utils";
import { PenLine, Trash2, TriangleAlert, CircleCheckBig } from "lucide-react";
import { ConfirmFormAction } from "@/components/confirm-form-action";

export const metadata: Metadata = { title: "Komponen Penilaian" };

export default async function KomponenPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const assignment = await prisma.teachingAssignment.findUnique({
    where: { id },
    include: { school: true, teacher: true, classRoom: true, subject: true, academicYear: true, components: { orderBy: [{ order: "asc" }, { name: "asc" }] } },
  });
  if (!assignment) notFound();
  if (!canAccessAssignment(session, assignment)) notFound();

  const totalWeight = assignment.components.reduce((s, c) => s + c.weight, 0);
  const redirectTo = `/penugasan/${assignment.id}`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Komponen Penilaian"
        subtitle={`${assignment.subject.name} — ${assignment.classRoom.name} — TA ${assignment.academicYear.year} ${SEMESTER_LABEL[assignment.academicYear.semester]} — ${assignment.teacher.name}`}
        action={<Link href={`/penilaian/${assignment.id}`} className="btn-primary btn-sm"><PenLine size={15} /> Input Nilai →</Link>}
      />
      <Alert searchParams={sp} />

      <div className={cn("mb-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm", Math.abs(totalWeight - 100) < 0.001 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
        {Math.abs(totalWeight - 100) < 0.001 ? <CircleCheckBig size={17} /> : <TriangleAlert size={17} />}
        <span>Total bobot saat ini: <b>{totalWeight}</b>{Math.abs(totalWeight - 100) >= 0.001 && <> — idealnya 100. Nilai akhir akan <b>dinormalisasi</b> terhadap total bobot, jadi tetap valid meskipun ≠ 100.</>}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Tambah komponen */}
        <form action={createComponentAction} className="card h-fit p-5 lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-800">Tambah Komponen</h2>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="space-y-3">
            <Field label="Nama Komponen" required hint="Bebas: Tugas 1, UH Bab 2, Proyek, Praktik…"><input name="name" required className="input" placeholder="Ulangan Harian" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bobot" required><input name="weight" type="number" min={0} step="any" required className="input" placeholder="30" /></Field>
              <Field label="Urutan" hint="Angka kecil tampil duluan"><input name="order" type="number" defaultValue={assignment.components.length + 1} className="input" /></Field>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full justify-center">+ Tambah Komponen</button>
        </form>

        {/* Daftar komponen */}
        <div className="lg:col-span-3">
          {assignment.components.length === 0 ? (
            <EmptyState title="Belum ada komponen" subtitle="Contoh: Tugas (20) + Ulangan Harian (30) + PTS (20) + PAS (30). Bobot bebas, dinormalisasi otomatis." />
          ) : (
            <div className="space-y-2">
              {assignment.components.map((c) => (
                <form key={c.id} action={updateComponentAction} className="card flex flex-wrap items-center gap-2 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input name="order" type="number" defaultValue={c.order} className="input w-16 text-center" title="Urutan" />
                  <input name="name" defaultValue={c.name} className="input min-w-0 flex-1" required />
                  <div className="flex items-center gap-1">
                    <input name="weight" type="number" min={0} step="any" defaultValue={c.weight} className="input w-20 text-center" required title="Bobot" />
                    <span className="text-xs font-semibold text-slate-400">bobot</span>
                  </div>
                  <button type="submit" className="btn-outline btn-sm">Simpan</button>
                  <ConfirmFormAction message="Hapus komponen ini? Semua nilai pada komponen ini ikut terhapus." formAction={deleteComponentAction} className="btn-ghost btn-sm !text-red-600" title="Hapus komponen"><Trash2 size={15} /></ConfirmFormAction>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
