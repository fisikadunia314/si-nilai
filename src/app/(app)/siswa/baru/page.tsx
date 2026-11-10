import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createStudentAction } from "@/server/actions";
import { PageHeader, Alert, Field } from "@/components/ui";
import { StudentForm } from "@/components/student-form";
import { SchoolAutoSelect } from "@/components/school-select";

export const metadata: Metadata = { title: "Tambah Siswa" };

export default async function BaruSiswaPage({ searchParams }: { searchParams: Promise<{ error?: string; sekolah?: string }> }) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  const schoolId = sp.sekolah ?? (session.schoolId ?? schools[0]?.id ?? "");
  const classes = schoolId ? await prisma.classRoom.findMany({ where: { schoolId }, orderBy: { name: "asc" } }) : [];
  const defs = schoolId
    ? await prisma.fieldDefinition.findMany({ where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, { schoolId }] }, orderBy: [{ order: "asc" }, { label: "asc" }] })
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tambah Siswa" subtitle="Lengkapi biodata di bawah. Kolom bertanda * wajib." />
      <Alert searchParams={sp} />
      {schools.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">Belum ada sekolah. <a href="/sekolah" className="font-semibold text-brand-700 hover:underline">Tambahkan sekolah dulu →</a></div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold">Sekolah:</span>
            <SchoolAutoSelect schools={schools} defaultValue={schoolId} basePath="/siswa/baru" />
          </div>
          <StudentForm
            action={createStudentAction}
            redirectTo="/siswa/baru"
            submitLabel="Simpan Siswa"
            classes={classes}
            defs={defs}
            schoolField={<input type="hidden" name="schoolId" value={schoolId} />}
          />
        </>
      )}
    </div>
  );
}
