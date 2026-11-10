import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canAccessAssignment } from "@/lib/leger";

export const runtime = "nodejs";

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    componentId: z.string().min(1),
    value: z.number().min(0).max(100).nullable(),
  })).max(20000),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Belum login." }, { status: 401 });

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ message: "Body bukan JSON valid." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ message: "Format data tidak valid. Nilai harus 0–100." }, { status: 400 });

  const { assignmentId, entries } = parsed.data;
  const assignment = await prisma.teachingAssignment.findUnique({ where: { id: assignmentId }, include: { components: { select: { id: true } }, classRoom: { select: { id: true } } } });
  if (!assignment) return NextResponse.json({ message: "Penugasan tidak ditemukan." }, { status: 404 });
  if (!canAccessAssignment(session, assignment)) return NextResponse.json({ message: "Anda bukan pemilik penugasan ini." }, { status: 403 });

  const componentIds = new Set(assignment.components.map((c) => c.id));
  const studentIds = new Set((await prisma.student.findMany({ where: { classRoomId: assignment.classRoomId }, select: { id: true } })).map((s) => s.id));

  const upserts: Array<ReturnType<typeof prisma.score.upsert>> = [];
  const deletes: Array<ReturnType<typeof prisma.score.deleteMany>> = [];
  for (const e of entries) {
    if (!componentIds.has(e.componentId)) continue;      // filter komponen asing
    if (!studentIds.has(e.studentId)) continue;          // siswa bukan dari kelas ini
    if (e.value === null) {
      deletes.push(prisma.score.deleteMany({ where: { componentId: e.componentId, studentId: e.studentId } }));
    } else {
      const value = Math.round(e.value * 100) / 100;
      upserts.push(prisma.score.upsert({
        where: { componentId_studentId: { componentId: e.componentId, studentId: e.studentId } },
        update: { value },
        create: { componentId: e.componentId, studentId: e.studentId, value },
      }));
    }
  }
  await prisma.$transaction([...deletes, ...upserts]);
  return NextResponse.json({ ok: true, saved: upserts.length, cleared: deletes.length });
}
