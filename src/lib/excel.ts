/**
 * Helpers Excel: template import siswa, export siswa, export leger, parsing import.
 */
import ExcelJS from "exceljs";

export type ExtraField = { key: string; label: string; type: string; options?: unknown };

const CORE_HEADERS = [
  { key: "nis", header: "NIS *", width: 14 },
  { key: "nisn", header: "NISN", width: 14 },
  { key: "nama", header: "NAMA LENGKAP *", width: 34 },
  { key: "jenis_kelamin", header: "JENIS KELAMIN (L/P)", width: 16 },
  { key: "tempat_lahir", header: "TEMPAT LAHIR", width: 18 },
  { key: "tanggal_lahir", header: "TANGGAL LAHIR (DD/MM/YYYY)", width: 22 },
  { key: "kelas", header: "KELAS", width: 16 },
  { key: "angkatan", header: "ANGKATAN", width: 12 },
  { key: "status", header: "STATUS (AKTIF/LULUS/PINDAH)", width: 24 },
] as const;

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D56EB" } } as const;
const THIN = { style: "thin", color: { argb: "FFB9C4D6" } } as const;
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = HEADER_FILL as ExcelJS.Fill;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
}

/** Template kosong (+ kolom field biodata custom) untuk diunduh user. */
export async function buildStudentTemplate(extraFields: ExtraField[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SiNilai";
  const ws = wb.addWorksheet("Siswa", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [...CORE_HEADERS, ...extraFields.map((f) => ({ key: `extra:${f.key}`, header: f.label.toUpperCase(), width: 22 }))];
  styleHeaderRow(ws.getRow(1));
  ws.addRow({ nis: "24.011", nisn: "0098765432", nama: "Contoh Nama Siswa", jenis_kelamin: "L", tempat_lahir: "Jakarta", tanggal_lahir: "15/01/2009", kelas: "XI IPA 1", angkatan: "2024", status: "AKTIF" });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  return wb.xlsx.writeBuffer();
}

/** Export daftar siswa ke xlsx. */
export async function buildStudentExport(
  students: Array<{ nis: string; nisn: string | null; name: string; gender: string | null; birthPlace: string | null; birthDate: Date | null; status: string; angkatan: string | null; extra: unknown; classRoom: { name: string } | null }>,
  extraFields: ExtraField[],
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Siswa", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { key: "no", header: "NO", width: 6 },
    ...CORE_HEADERS,
    ...extraFields.map((f) => ({ key: `extra:${f.key}`, header: f.label.toUpperCase(), width: 22 })),
  ];
  styleHeaderRow(ws.getRow(1));
  students.forEach((s, i) => {
    const extra = (s.extra ?? {}) as Record<string, unknown>;
    ws.addRow({
      no: i + 1, nis: s.nis, nisn: s.nisn ?? "", nama: s.name,
      jenis_kelamin: s.gender === "PEREMPUAN" ? "P" : s.gender === "LAKI_LAKI" ? "L" : "",
      tempat_lahir: s.birthPlace ?? "",
      tanggal_lahir: s.birthDate ? new Intl.DateTimeFormat("id-ID").format(s.birthDate) : "",
      kelas: s.classRoom?.name ?? "", angkatan: s.angkatan ?? "",
      status: s.status === "ACTIVE" ? "AKTIF" : s.status === "GRADUATED" ? "LULUS" : "PINDAH",
      ...Object.fromEntries(extraFields.map((f) => [`extra:${f.key}`, extra[f.key] == null ? "" : String(extra[f.key])])),
    });
    ws.getRow(i + 2).eachCell((c) => { c.border = BORDER; });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  return wb.xlsx.writeBuffer();
}

export type LegerRow = { nis: string; name: string; values: Array<number | null>; final: number | null; passed: boolean | null };
export type LegerInfo = {
  schoolName: string; schoolAddress?: string | null; className: string;
  subjectName: string; subjectCode: string; teacherName: string;
  year: string; semester: string; passingGrade: number;
};

/** Leger nilai per penugasan (komponen × siswa). */
export async function buildLegerExport(info: LegerInfo, componentNames: string[], rows: LegerRow[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Leger", { views: [{ state: "frozen", ySplit: 6, xSplit: 3 }] });
  const totalCols = 3 + componentNames.length + 2;
  ws.mergeCells(1, 1, 1, totalCols); ws.getCell("A1").value = info.schoolName; ws.getCell("A1").font = { bold: true, size: 14 }; ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells(2, 1, 2, totalCols); ws.getCell("A2").value = "LEGER NILAI"; ws.getCell("A2").font = { bold: true, size: 12 }; ws.getCell("A2").alignment = { horizontal: "center" };
  ws.mergeCells(3, 1, 3, totalCols); ws.getCell("A3").value = `${info.subjectName} (${info.subjectCode}) — Kelas ${info.className} — Semester ${info.semester} TA ${info.year}`; ws.getCell("A3").alignment = { horizontal: "center" }; ws.getCell("A3").font = { size: 10 };
  ws.mergeCells(4, 1, 4, totalCols); ws.getCell("A4").value = `Guru: ${info.teacherName}   |   KKM: ${info.passingGrade}`; ws.getCell("A4").alignment = { horizontal: "center" }; ws.getCell("A4").font = { size: 10, italic: true };
  const headerRow = ws.getRow(6);
  headerRow.values = ["NO", "NIS", "NAMA SISWA", ...componentNames.map((n) => n.toUpperCase()), "NILAI AKHIR", "KETERANGAN"];
  styleHeaderRow(headerRow);
  ws.getColumn(1).width = 6; ws.getColumn(2).width = 15; ws.getColumn(3).width = 34;
  componentNames.forEach((_, i) => { ws.getColumn(4 + i).width = 16; });
  ws.getColumn(totalCols - 1).width = 14; ws.getColumn(totalCols).width = 14;
  rows.forEach((r, i) => {
    const row = ws.getRow(7 + i);
    row.values = [i + 1, r.nis, r.name, ...r.values.map((v) => (v == null ? "-" : v)), r.final == null ? "-" : r.final, r.passed == null ? "-" : r.passed ? "Tuntas" : "Belum Tuntas"];
    row.eachCell((c) => { c.border = BORDER; c.alignment = { vertical: "middle", horizontal: Number(c.col) === 3 ? "left" : "center" }; });
    if (r.passed === false) row.getCell(totalCols).font = { color: { argb: "FFDC2626" }, bold: true };
  });
  ws.pageSetup = { orientation: componentNames.length > 5 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 }, printTitlesRow: "1:6" };
  ws.headerFooter = { oddFooter: "&LVT dicetak dari SiNilai&RHalaman &P dari &N" };
  return wb.xlsx.writeBuffer();
}

// ---------- IMPORT PARSING ----------
export type ParsedStudent = {
  nis: string; nisn: string | null; name: string;
  gender: "LAKI_LAKI" | "PEREMPUAN" | null;
  birthPlace: string | null; birthDate: Date | null;
  className: string | null; angkatan: string | null;
  status: "ACTIVE" | "GRADUATED" | "MOVED_OUT";
  extra: Record<string, unknown>;
};
export type ParsedRow = { rowNumber: number; data: ParsedStudent | null; errors: string[] };

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray((v as ExcelJS.CellRichTextValue).richText)) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("").trim();
    if ("text" in v) return String((v as { text: unknown }).text ?? "").trim();
    if ("result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "").trim();
    return String(v).trim();
  }
  return String(v).trim();
}

function parseDateCell(v: ExcelJS.CellValue): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = cellText(v);
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) { const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); return isNaN(d.getTime()) ? null : d; }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseGender(s: string): ParsedStudent["gender"] {
  const v = s.trim().toUpperCase();
  if (["L", "LAKI-LAKI", "LAKI LAKI", "LAKI_LAKI", "PRIA", "M"].includes(v)) return "LAKI_LAKI";
  if (["P", "PEREMPUAN", "WANITA", "F"].includes(v)) return "PEREMPUAN";
  return null;
}

function parseStatus(s: string): ParsedStudent["status"] {
  const v = s.trim().toUpperCase();
  if (["LULUS", "GRADUATED"].includes(v)) return "GRADUATED";
  if (["PINDAH", "MOVED_OUT", "KELUAR"].includes(v)) return "MOVED_OUT";
  return "ACTIVE";
}

export async function parseStudentWorkbook(
  buffer: Buffer,
  extraFields: Array<ExtraField & { required?: boolean }>,
): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [{ rowNumber: 0, data: null, errors: ["File tidak berisi sheet apapun."] }];

  // Petakan header kolom (baris 1) → index
  const headerMap = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => { headerMap.set(cellText(cell.value).toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/\*+/g, "").trim(), col); });
  const findCol = (...names: string[]) => { for (const n of names) { const idx = headerMap.get(n); if (idx) return idx; } return undefined; };

  const colNis = findCol("nis"); const colNisn = findCol("nisn"); const colNama = findCol("nama lengkap", "nama", "name");
  const colGender = findCol("jenis kelamin", "gender", "jk", "kelamin"); const colBirthPlace = findCol("tempat lahir");
  const colBirthDate = findCol("tanggal lahir", "tgl lahir", "birthdate"); const colClass = findCol("kelas", "rombel", "class");
  const colAngkatan = findCol("angkatan"); const colStatus = findCol("status");

  // Kolom extra: header = key atau label (case-insensitive, tanpa anotasi kurung/bintang)
  const extraColMap = new Map<number, ExtraField & { required?: boolean }>();
  for (const f of extraFields) {
    const col = findCol(f.key.toLowerCase(), f.label.toLowerCase());
    if (col) extraColMap.set(col, f);
  }

  const results: ParsedRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw = (col?: number) => (col ? row.getCell(col).value : null);
    const nis = cellText(raw(colNis));
    const name = cellText(raw(colNama));
    // Baris kosong total → lewati diam-diam
    const allEmpty = !nis && !name && !cellText(raw(colNisn));
    if (allEmpty) return;

    const errors: string[] = [];
    if (!nis) errors.push("NIS wajib diisi");
    if (!name) errors.push("Nama wajib diisi");

    let birthDate: Date | null = null;
    const rawBirth = raw(colBirthDate);
    if (cellText(rawBirth)) {
      birthDate = parseDateCell(rawBirth);
      if (!birthDate) errors.push("Format tanggal lahir tidak valid (gunakan DD/MM/YYYY)");
    }

    const genderText = cellText(raw(colGender));
    const gender = genderText ? parseGender(genderText) : null;
    if (genderText && !gender) errors.push(`Jenis kelamin "${genderText}" tidak dikenali (L/P)`);

    const extra: Record<string, unknown> = {};
    for (const [col, f] of extraColMap) {
      const v = cellText(row.getCell(col).value);
      if (!v) { if (f.required) errors.push(`Field "${f.label}" wajib diisi`); continue; }
      if (f.type === "NUMBER") { const n = Number(v.replace(",", ".")); if (isNaN(n)) errors.push(`"${f.label}" harus angka`); else extra[f.key] = n; }
      else if (f.type === "BOOLEAN") extra[f.key] = ["YA", "TRUE", "1", "Y"].includes(v.toUpperCase());
      else if (f.type === "DATE") { const d = parseDateCell(row.getCell(col).value); if (!d) errors.push(`"${f.label}" tanggal tidak valid`); else extra[f.key] = d.toISOString().slice(0, 10); }
      else extra[f.key] = v;
    }

    results.push({
      rowNumber,
      data: errors.length === 0 ? { nis, nisn: cellText(raw(colNisn)) || null, name, gender, birthPlace: cellText(raw(colBirthPlace)) || null, birthDate, className: cellText(raw(colClass)) || null, angkatan: cellText(raw(colAngkatan)) || null, status: parseStatus(cellText(raw(colStatus))), extra } : null,
      errors,
    });
  });

  // Duplikat NIS di dalam file
  const seen = new Map<string, number>();
  for (const r of results) {
    if (!r.data) continue;
    const prev = seen.get(r.data.nis);
    if (prev) { r.errors.push(`NIS duplikat dengan baris ${prev}`); r.data = null; } else seen.set(r.data.nis, r.rowNumber);
  }
  return results;
}
