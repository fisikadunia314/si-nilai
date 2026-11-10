import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseStudentWorkbook } from "@/lib/excel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Hanya admin." }, { status: 403 });

  const mode = req.nextUrl.searchParams.get("mode") === "commit" ? "commit" : "preview";
  const form = await req.formData();
  const file = form.get("file");
  const schoolId = String(form.get("schoolId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ message: "File tidak ditemukan." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "File melebihi 5 MB." }, { status: 400 });
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ message: "Sekolah tidak valid." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const defs = await prisma.fieldDefinition.findMany({
    where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, { schoolId }] },
    orderBy: { order: "asc" },
  });

  let parsed;
  try {
    parsed = await parseStudentWorkbook(buffer, defs.map((d) => ({ key: d.key, label: d.label, type: d.type, required: d.required, options: d.options })));
  } catch (e) {
    return NextResponse.json({ message: `Gagal membaca file Excel: ${e instanceof Error ? e.message : "format tidak dikenali"}` }, { status: 400 });
  }

  // Kelas & duplikat DB
  const classes = await prisma.classRoom.findMany({ where: { schoolId } });
  const classByName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c]));
  const nisList = parsed.map((r) => r.data?.nis).filter((v): v is string => !!v);
  const existing = await prisma.student.findMany({ where: { schoolId, nis: { in: nisList } }, select: { nis: true } });
  const existingNis = new Set(existing.map((s) => s.nis));

  const rows = parsed.map((r) => {
    const data = r.data;
    if (!data) return { rowNumber: r.rowNumber, nis: "", name: "", className: null, errors: r.errors, skipped: false };
    const errors = [...r.errors];
    if (data.className && !classByName.has(data.className.trim().toLowerCase())) {
      errors.push(`Kelas "${data.className}" tidak ditemukan di sekolah ini`);
    }
    const dupDb = existingNis.has(data.nis);
    return { rowNumber: r.rowNumber, nis: data.nis, name: data.name, className: data.className, errors, skipped: dupDb && errors.length === 0 };
  });

  const valid = rows.filter((r) => r.errors.length === 0 && !r.skipped);
  const invalid = rows.filter((r) => r.errors.length > 0);
  const duplicates = rows.filter((r) => r.skipped);

  if (mode === "preview") {
    return NextResponse.json({ ok: true, rows, total: rows.length, valid: valid.length, invalid: invalid.length, duplicates: duplicates.length });
  }

  // COMMIT: insert hanya baris valid & bukan duplikat
  let inserted = 0;
  const errors: Array<{ row: number; message: string }> = [];
  const validParsed = parsed.filter((r) => r.data && !existingNis.has(r.data.nis));
  for (const r of validParsed) {
    const d = r.data!;
    const errs = rows.find((x) => x.rowNumber === r.rowNumber)?.errors ?? [];
    if (errs.length) continue;
    try {
      await prisma.student.create({
        data: {
          schoolId, nis: d.nis, nisn: d.nisn, name: d.name, gender: d.gender,
          birthPlace: d.birthPlace, birthDate: d.birthDate,
          classRoomId: d.className ? classByName.get(d.className.trim().toLowerCase())?.id ?? null : null,
          angkatan: d.angkatan, status: d.status, extra: d.extra as object,
        },
      });
      inserted++;
    } catch (e) {
      errors.push({ row: r.rowNumber, message: e instanceof Error ? e.message : "Gagal insert" });
    }
  }

  return NextResponse.json({ ok: true, inserted, skippedDuplicates: duplicates.length, skippedInvalid: invalid.length, errors });
}
