import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildLegerData, canAccessAssignment } from "@/lib/leger";
import { buildLegerExport } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Belum login." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("assignmentId") ?? "";
  const data = await buildLegerData(id);
  if (!data) return NextResponse.json({ message: "Penugasan tidak ditemukan." }, { status: 404 });
  if (!canAccessAssignment(session, data.assignment)) return NextResponse.json({ message: "Tidak punya akses." }, { status: 403 });

  const buffer = await buildLegerExport(data.info, data.componentNames, data.rows);
  const filename = `Leger-${data.info.className.replace(/\s+/g, "")}-${data.info.subjectCode}.xlsx`;
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
