import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildStudentTemplate } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Belum login." }, { status: 401 });
  const isAdmin = session.role === "ADMIN";
  const sekolah = req.nextUrl.searchParams.get("sekolah");
  const effectiveSchoolId = isAdmin ? sekolah : session.schoolId;

  const defs = await prisma.fieldDefinition.findMany({
    where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, ...(effectiveSchoolId ? [{ schoolId: effectiveSchoolId }] : [])] },
    orderBy: { order: "asc" },
  });
  const buffer = await buildStudentTemplate(defs.map((d) => ({ key: d.key, label: d.label, type: d.type, options: d.options })));
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-siswa.xlsx"',
    },
  });
}
