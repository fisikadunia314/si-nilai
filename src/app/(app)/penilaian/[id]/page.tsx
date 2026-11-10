import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canAccessAssignment } from "@/lib/leger";
import { Gradebook } from "@/components/gradebook";
import { SEMESTER_LABEL } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = { title: "Grid Nilai" };

export default async function GradebookPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const a = await prisma.teachingAssignment.findUnique({
    where: { id },
    include: {
      school: true, teacher: true, subject: true, academicYear: true,
      components: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      classRoom: { include: { students: { where: { status: "ACTIVE" }, orderBy: { name: "asc" }, include: { scores: true } } } },
    },
  });
  if (!a) notFound();
  if (!canAccessAssignment(session, a)) notFound();

  const initialScores: Record<string, Record<string, number | null>> = {};
  for (const st of a.classRoom.students) {
    initialScores[st.id] = {};
    for (const c of a.components) {
      const s = st.scores.find((x) => x.componentId === c.id);
      initialScores[st.id][c.id] = s?.value ?? null;
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/penilaian" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"><ArrowLeft size={12} /> Input Nilai</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{a.subject.name} <span className="text-slate-400">—</span> {a.classRoom.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{a.school.name} • TA {a.academicYear.year} {SEMESTER_LABEL[a.academicYear.semester]} • KKM {a.school.passingGrade}</p>
        </div>
        <Link href={`/rekap/${a.id}`} className="btn-outline btn-sm"><FileSpreadsheet size={15} /> Lihat Rekap & Export</Link>
      </div>

      {a.components.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">Belum ada komponen penilaian. <Link href={`/penugasan/${a.id}`} className="font-semibold text-brand-700 hover:underline">Tambahkan komponen dulu →</Link></div>
      ) : a.classRoom.students.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">Kelas ini belum punya siswa aktif. Tambahkan siswa di menu Data Siswa.</div>
      ) : (
        <Gradebook
          assignmentId={a.id}
          kkm={a.school.passingGrade}
          students={a.classRoom.students.map((s) => ({ id: s.id, nis: s.nis, name: s.name }))}
          components={a.components.map((c) => ({ id: c.id, name: c.name, weight: c.weight }))}
          initialScores={initialScores}
        />
      )}
    </div>
  );
}
