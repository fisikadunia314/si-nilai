import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { SEMESTER_LABEL } from "@/lib/utils";
import { FileSpreadsheet, PenLine } from "lucide-react";

export const metadata: Metadata = { title: "Rekap & Leger" };

export default async function RekapPage() {
  const session = await requireUser();
  const isAdmin = session.role === "ADMIN";
  const assignments = await prisma.teachingAssignment.findMany({
    where: isAdmin ? {} : { teacherId: session.uid },
    include: { school: true, teacher: true, classRoom: true, subject: true, academicYear: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Rekap & Leger" subtitle="Lihat rekapitulasi nilai, cetak PDF leger, atau unduh Excel." />
      {assignments.length === 0 ? <EmptyState title="Belum ada penugasan" subtitle="Tidak ada data rekap untuk ditampilkan." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => (
            <div key={a.id} className="card p-5">
              <p className="text-lg font-extrabold text-slate-900">{a.subject.name}</p>
              <p className="text-sm font-semibold text-brand-700">{a.classRoom.name} <span className="font-normal text-slate-400">• {a.academicYear.year} {SEMESTER_LABEL[a.academicYear.semester]}</span></p>
              <p className="mt-1 truncate text-xs text-slate-500">{a.teacher.name}{isAdmin && <> • {a.school.name}</>}</p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link href={`/rekap/${a.id}`} className="btn-primary btn-sm"><FileSpreadsheet size={15} /> Buka Rekap</Link>
                <Link href={`/penilaian/${a.id}`} className="btn-outline btn-sm"><PenLine size={15} /> Edit Nilai</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
