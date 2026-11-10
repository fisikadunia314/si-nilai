import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildStudentExport } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Belum login." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const isAdmin = session.role === "ADMIN";
  const schoolIdParam = sp.get("sekolah");
  const effectiveSchoolId = isAdmin ? schoolIdParam ?? undefined : session.schoolId ?? "__none__";

  const where: Record<string, unknown> = {};
  if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
  const kelas = sp.get("kelas");
  if (kelas) where.classRoomId = kelas === "-" ? null : kelas;
  const status = sp.get("status");
  if (status) where.status = status;
  const q = sp.get("q");
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { nis: { contains: q } }, { nisn: { contains: q } }];

  const [students, defs] = await Promise.all([
    prisma.student.findMany({ where, include: { classRoom: true }, orderBy: [{ classRoom: { name: "asc" } }, { name: "asc" }] }),
    prisma.fieldDefinition.findMany({ where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, ...(effectiveSchoolId ? [{ schoolId: effectiveSchoolId }] : [])] }, orderBy: { order: "asc" } }),
  ]);

  const buffer = await buildStudentExport(students, defs.map((d) => ({ key: d.key, label: d.label, type: d.type, options: d.options })));
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="data-siswa${effectiveSchoolId ? `-${effectiveSchoolId.slice(0, 6)}` : ""}.xlsx"`,
    },
  });
}
