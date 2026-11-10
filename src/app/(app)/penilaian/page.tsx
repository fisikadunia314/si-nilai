import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { SEMESTER_LABEL } from "@/lib/utils";
import { PenLine, Settings2 } from "lucide-react";

export const metadata: Metadata = { title: "Input Nilai" };

export default async function PenilaianPage() {
  const session = await requireUser();
  const isAdmin = session.role === "ADMIN";
  const assignments = await prisma.teachingAssignment.findMany({
    where: isAdmin ? {} : { teacherId: session.uid },
    include: { school: true, teacher: true, classRoom: true, subject: true, academicYear: true, _count: { select: { components: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Input Nilai" subtitle="Pilih penugasan, lalu isi nilai per siswa × komponen. Nilai akhir dihitung otomatis dari bobot." />
      {assignments.length === 0 ? (
        <EmptyState title="Belum ada penugasan" subtitle={isAdmin ? "Buat penugasan dulu di menu Penugasan Guru." : "Belum ada penugasan mengajar untuk Anda."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => (
            <div key={a.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-tight text-slate-900">{a.subject.name}</p>
                  <p className="mt-0.5 text-sm font-semibold text-brand-700">{a.classRoom.name} <span className="font-normal text-slate-400">• {a.academicYear.year} {SEMESTER_LABEL[a.academicYear.semester]}</span></p>
                  <p className="mt-1 truncate text-xs text-slate-500">{a.teacher.name}{isAdmin && <> • {a.school.name}</>}</p>
                </div>
                <span className="badge-blue shrink-0">{a._count.components} komponen</span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <Link href={`/penilaian/${a.id}`} className="btn-primary btn-sm"><PenLine size={15} /> Buka Grid Nilai</Link>
                <Link href={`/penugasan/${a.id}`} className="btn-outline btn-sm"><Settings2 size={15} /> Komponen</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
