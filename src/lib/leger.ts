import { prisma } from "@/lib/prisma";
import { computeFinal } from "@/lib/grade";
import { SEMESTER_LABEL } from "@/lib/utils";
import type { SessionPayload } from "@/lib/session";

/** Ambil seluruh data untuk leger/rekap. Return null jika TA tidak ada. */
export async function buildLegerData(assignmentId: string) {
  const a = await prisma.teachingAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      school: true,
      teacher: true,
      subject: true,
      academicYear: true,
      classRoom: {
        include: {
          students: {
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            include: { scores: true },
          },
        },
      },
      components: { orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  });
  if (!a) return null;

  const componentNames = a.components.map((c) => c.name);
  const rows = a.classRoom.students.map((st) => {
    const byComp = new Map(st.scores.map((s) => [s.componentId, s.value]));
    const values = a.components.map((c) => byComp.get(c.id) ?? null);
    const final = computeFinal(values.map((v) => ({ value: v })), a.components.map((c) => ({ weight: c.weight })));
    const passed = final == null ? null : final >= a.school.passingGrade;
    return { nis: st.nis, name: st.name, values, final, passed };
  });

  return {
    assignment: a,
    info: {
      schoolName: a.school.name,
      schoolAddress: [a.school.address, a.school.city].filter(Boolean).join(", ") || null,
      className: a.classRoom.name,
      subjectName: a.subject.name,
      subjectCode: a.subject.code,
      teacherName: a.teacher.name,
      year: a.academicYear.year,
      semester: SEMESTER_LABEL[a.academicYear.semester] ?? a.academicYear.semester,
      passingGrade: a.school.passingGrade,
    },
    componentNames,
    rows,
  };
}

/** ADMIN boleh semua; GURU hanya penugasan miliknya. */
export function canAccessAssignment(session: SessionPayload, a: { teacherId: string; schoolId: string }): boolean {
  if (session.role === "ADMIN") return true;
  return a.teacherId === session.uid && a.schoolId === session.schoolId;
}
