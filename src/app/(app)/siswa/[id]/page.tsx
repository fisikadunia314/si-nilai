import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { updateStudentAction } from "@/server/actions";
import { PageHeader, Alert } from "@/components/ui";
import { StudentForm } from "@/components/student-form";

export const metadata: Metadata = { title: "Edit Siswa" };

export default async function EditSiswaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const student = await prisma.student.findUnique({ where: { id }, include: { school: true } });
  if (!student) notFound();
  if (session.role !== "ADMIN" && student.schoolId !== session.schoolId) notFound();
  const classes = await prisma.classRoom.findMany({ where: { schoolId: student.schoolId }, orderBy: { name: "asc" } });
  const defs = await prisma.fieldDefinition.findMany({ where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, { schoolId: student.schoolId }] }, orderBy: [{ order: "asc" }, { label: "asc" }] });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit: ${student.name}`} subtitle={`${student.school.name} — NIS ${student.nis}`} />
      <Alert searchParams={sp} />
      <StudentForm
        action={updateStudentAction}
        redirectTo={`/siswa/${student.id}`}
        hiddenId={student.id}
        submitLabel="Simpan Perubahan"
        classes={classes}
        defs={defs}
        defaults={{ nis: student.nis, nisn: student.nisn, name: student.name, gender: student.gender, birthPlace: student.birthPlace, birthDate: student.birthDate, status: student.status, angkatan: student.angkatan, classRoomId: student.classRoomId, extra: (student.extra ?? {}) as Record<string, unknown> }}
        schoolField={<div className="self-end pb-2 text-sm text-slate-500">Sekolah: <span className="font-semibold text-slate-800">{student.school.name}</span></div>}
      />
    </div>
  );
}
